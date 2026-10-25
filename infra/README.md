# infra

Terraform for AWS Mumbai (`ap-south-1`): the API and BullMQ workers on ECS Fargate behind API Gateway HTTP API → VPC Link → Cloud Map, with no load balancer and no NAT gateway (D28, D38, D42). State lives in S3 with lock files (D39). A person runs `terraform apply`. Agents have no production credentials, and CI only runs the mocked tests.

| Folder | What | State |
|---|---|---|
| `bootstrap/` | Once per AWS account: state bucket, ECR repo `biz4kit-api`, GitHub OIDC deploy roles | Local first, then moved into the bucket (step 1) |
| `.` (root) | One stack per environment: VPC, ECS cluster and services, API Gateway, Cloud Map, Secrets Manager, files bucket (D31), log groups | `s3://biz4kit-tfstate-<account>/env/<environment>.tfstate` |
| `tests/`, `bootstrap/tests/` | `terraform test` against a mocked AWS provider: each assert is a decision | none |

Run the tests with `pnpm test:infra`. They need no AWS account.

## Not built yet

- PR previews run the API as a Vercel function against the PR's Neon branch (D109). Not built yet.

## 1. Bootstrap (once per account)

**Done on 2026-10-25** for account `438585988393`: state bucket `biz4kit-tfstate-438585988393`, ECR `biz4kit-api`, GitHub OIDC and the two deploy roles. The bootstrap state is in that bucket under `bootstrap.tfstate`. To change it later:

```sh
cd infra/bootstrap
terraform init -backend-config="bucket=biz4kit-tfstate-438585988393" \
  -backend-config="key=bootstrap.tfstate" -backend-config="region=ap-south-1" \
  -backend-config="use_lockfile=true" -backend-config="encrypt=true" -backend-config="profile=biz4kit"
terraform apply
```

On a new account, comment out `backend "s3" {}` in `bootstrap/main.tf` for the first apply (the bucket does not exist yet), then put it back and run the init above with `-migrate-state`.

Push a first image so the services have something to run. The tag is the commit SHA, the same one CI uses:

```sh
aws ecr get-login-password --profile biz4kit | docker login --username AWS --password-stdin <ecr_repository_url host>
docker build -f apps/server/Dockerfile -t <ecr_repository_url>:$(git rev-parse HEAD) .
docker push <ecr_repository_url>:$(git rev-parse HEAD)
```

## 2. An environment (staging, then production)

```sh
cd infra
terraform init -backend-config=backend/staging.hcl -backend-config="bucket=biz4kit-tfstate-<account>"
terraform apply -var environment=staging -var aws_profile=biz4kit \
  -var image_tag=<sha> -var web_origin=https://<staging web origin> \
  -var sentry_dsn=<Sentry project DSN>
```

Fill in each secret once. Terraform creates the secrets empty and never holds the values:

```sh
for name in DATABASE_URL REDIS_URL BETTER_AUTH_SECRET; do
  aws secretsmanager put-secret-value --profile biz4kit \
    --secret-id "biz4kit/staging/$name" --secret-string "<value>"
done
```

- `DATABASE_URL`: the Neon `dev` branch for staging (`prod` for production), pooled connection string (D105).
- `REDIS_URL`: the Upstash **TCP** endpoint, `rediss://…` (D29, D33), not the REST URL.
- Polar is unwired in Phase 1 (D98): `POLAR_ACCESS_TOKEN` is optional and has no secret until WBS 5.5.

Then force a new deployment: `aws ecs update-service --cluster biz4kit-staging --service api --force-new-deployment` (do the same for `worker`). Check it with `curl $(terraform output -raw api_url)/health`, which should return `{"status":"ok"}`.

## 3. GitHub (Settings → Environments)

| Environment | Variables | Secrets | Protection |
|---|---|---|---|
| `staging` | `AWS_DEPLOY_ROLE_ARN` (bootstrap output), `API_URL`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `STAGING_WEB_DOMAIN` (optional), `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | `VERCEL_TOKEN`, `SENTRY_AUTH_TOKEN` | branch `main` |
| `production` | the same, with production values | `VERCEL_TOKEN`, `SENTRY_AUTH_TOKEN` | tags `v*`, required reviewer: the human |

The deploy roles trust only `repo:7show2me/Biz4kit:environment:<name>`. A workflow outside that environment cannot assume them.

## 4. Neon (D4, D105, D111, D114)

Project `biz4kit` (`fancy-leaf-05807484`), created 2026-10-25 in `aws-ap-southeast-1` (Singapore): Neon does not offer Mumbai to our account (D111). Long-lived branches: `prod` (the default branch, renamed from `main`), `dev` created from it, and `test` created from `dev` (D113). The staging environment uses `dev`. There is no branch per pull request (D114): CI runs the database tests on `test` through the repository secrets `TEST_DATABASE_URL` (app role) and `TEST_DATABASE_MIGRATION_URL` (owner), and PR previews use `test` too (D115). CI does not reset `test`; reset it by hand with `pnpm db:test:reset` when it drifts, for example after an abandoned PR's migration (D116).

```sh
neonctl branches rename main prod --project-id <id>
neonctl branches create --project-id <id> --name dev --parent prod
```

**Restore drill (the WBS 1.1 check; day 8 and monthly after, logged in Linear):**

```sh
# Restore dev to how it was 1 hour ago; the pre-restore state is kept as a backup branch.
# The free plan keeps 6 hours of history, so the restore point must be inside that.
neonctl branches restore dev ^self@$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --project-id <id> --preserve-under-name dev-before-restore
```

Confirm a row written after that time is gone, then delete `dev-before-restore`.

## 5. Sentry (D104)

Free Developer plan: 5,000 errors a month, one user. Create one project for Biz4Kit and copy its DSN. No Sentry CLI is needed: the API and workers read `SENTRY_DSN` from the task definition, and the web build uploads source maps through the Vite plugin when `SENTRY_AUTH_TOKEN` is set. An empty DSN turns reporting off, which is how local dev and CI run.

Every event passes through `@Biz4kit/monitoring` first. It drops request bodies, headers, cookies and query strings, keeps only the user id, and masks emails, phone numbers, UPI IDs, GSTINs and PANs.

For Vercel PR previews, add `VITE_SENTRY_DSN` and `VITE_SENTRY_ENVIRONMENT=preview` to the Vercel project's Preview environment.

## 6. Deploys and rollback

- Merging to `main` deploys staging: the API and workers to ECS, and the web app to Vercel.
- A `v*` tag pushed by the human deploys that commit to production. The image already in ECR is reused.
- To roll back, run **Deploy** by hand on the previous tag. ECR tags are immutable, so a tag always means the same build. ECS also rolls back on its own if a new revision fails its health check (circuit breaker).
- Vercel's Git integration still builds PR previews. Auto-deploy from `main` is off in `vercel.json`, so production on Vercel follows tags too.
