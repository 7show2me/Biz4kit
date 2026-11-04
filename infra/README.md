# infra

Terraform for AWS Mumbai (`ap-south-1`): the API and BullMQ workers on ECS Fargate behind API Gateway HTTP API → VPC Link → Cloud Map, with no load balancer and no NAT gateway (D28, D38, D42). State lives in S3 with lock files (D39). A person runs `terraform apply`. Agents have no production credentials, and CI only runs the mocked tests.

| Folder | What | State |
|---|---|---|
| `bootstrap/` | Once per AWS account: state bucket, ECR repo `biz4kit-api`, GitHub OIDC deploy roles | Local first, then moved into the bucket (step 1) |
| `.` (root) | One stack per environment: VPC, ECS cluster and services, API Gateway, Cloud Map, Secrets Manager, files bucket (D31), log groups | `s3://biz4kit-tfstate-<account>/env/<environment>.tfstate` |
| `tests/`, `bootstrap/tests/` | `terraform test` against a mocked AWS provider: each assert is a decision | none |

Run the tests with `pnpm test:infra`. They need no AWS account.

## Not built yet

- PR previews have no API of their own for now (D126). They build against the dev API URL, which rejects them through CORS, so sign-in and data calls fail on a preview. Test API changes on `dev`.

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

## 2. An environment (dev, then production; D118)

```sh
cd infra
terraform init -backend-config=backend/dev.hcl -backend-config="bucket=biz4kit-tfstate-<account>"
terraform apply -var environment=dev -var aws_profile=biz4kit \
  -var image_tag=<sha> -var web_origin=https://biz4kit-dev.vercel.app \
  -var sentry_dsn=<Sentry project DSN>
```

Fill in each secret once. Terraform creates the secrets empty and never holds the values:

```sh
for name in DATABASE_URL REDIS_URL BETTER_AUTH_SECRET; do
  aws secretsmanager put-secret-value --profile biz4kit \
    --secret-id "biz4kit/dev/$name" --secret-string "<value>"
done
```

- `DATABASE_URL`: the Neon `dev` branch for dev (`prod` for production), pooled connection string (D105).
- `REDIS_URL`: the Upstash **TCP** endpoint, `rediss://…` (D29, D33), not the REST URL. Production uses dev's database (D121); Terraform sets its `QUEUE_PREFIX`.
- Polar is unwired in Phase 1 (D98): `POLAR_ACCESS_TOKEN` is optional and has no secret until WBS 5.5.

**Dev-only secrets (Google sign-in, Resend, smoke test).** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` and `SMOKE_SECRET` exist only in `dev`; production gets none, so the `/__smoke` routes can never run there. Two steps, so a task never points at a secret with no value (it would fail to start):

1. Create them empty. A targeted plan touches only the four secrets and one IAM policy; a full plan also shows an old Cloud Map replacement (see Known drift):
   ```sh
   terraform apply -var environment=dev -var aws_profile=biz4kit -var image_tag=<sha>      -var web_origin=https://biz4kit-dev.vercel.app -var sentry_dsn=<DSN>      -target='aws_secretsmanager_secret.server' -target=aws_iam_role_policy.task_execution_secrets
   ```
2. Fill each one with `aws secretsmanager put-secret-value` (the Google pair is in the `wave-a-shell-auth` worktree's `apps/server/.env.local`; `SMOKE_SECRET` matches the GitHub `dev` secret of the same name). Then apply again with `-var wire_extra_secrets=true` and force a new deployment.

Google redirect URI to register in the Google console: `<API_URL>/api/auth/callback/google`. The API reads no Google or Resend value yet; the auth provider and email adapter land with their WBS packages.

**Known drift (not from this change).** A full `terraform plan` on dev replaces `aws_service_discovery_service.api` (the provider now wants `health_check_custom_config {}` removed or added), which also updates the API Gateway integration and the ECS service registry. Fix the drift on its own before a full apply.

Then force a new deployment: `aws ecs update-service --cluster biz4kit-dev --service api --force-new-deployment` (do the same for `worker`). Check it with `curl $(terraform output -raw api_url)/health`, which should return `{"status":"ok"}`.

## 3. GitHub (Settings → Environments)

| Environment | Variables | Secrets | Protection |
|---|---|---|---|
| `dev` | `AWS_DEPLOY_ROLE_ARN` (bootstrap output), `API_URL`, `SENTRY_DSN` | `SMOKE_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET` (the smoke test) | branch `dev` |
| `production` | the same, with production values | none | branch `main`, required reviewer: the human |

The deploy roles trust only `repo:7show2me@293344814/Biz4kit@1425347880:environment:<name>`: the repo uses GitHub's immutable OIDC subject (`gh api repos/7show2me/Biz4kit/actions/oidc/customization/sub`). A workflow outside that environment cannot assume them.

## 4. Neon (D4, D105, D111, D117)

Project `biz4kit` (`fancy-leaf-05807484`), created 2026-10-25 in `aws-ap-southeast-1` (Singapore): Neon does not offer Mumbai to our account (D111). Long-lived branches: `prod` (the default branch, renamed from `main`), `dev` created from it, and `test` created from `dev` for local test runs (D113). The dev environment uses `dev`. Every pull request gets `preview/pr-<n>` (D105, D117), recreated as a fresh copy of `dev` on each push, migrated, tested and deleted on close (`.github/workflows/database.yml`). GitHub gets `NEON_API_KEY` and `NEON_PROJECT_ID` from the Neon GitHub integration (Neon console → Integrations → GitHub). The free plan allows 10 branches per project, so about 7 PRs can be open at once.

```sh
neonctl branches rename main prod --project-id <id>
neonctl branches create --project-id <id> --name dev --parent prod
```

**Restore drill (the WBS 1.1 check; day 8 and monthly after, logged in Linear):**

```sh
pnpm drill:neon-restore            # dry run, changes nothing
pnpm drill:neon-restore -- --yes   # about 2 minutes
```

It branches `dev` into `drill/restore-<time>`, writes a row, waits, writes a second row, restores the branch to the moment between them, checks the second row is gone, and deletes the drill branches. It refuses any branch that is not `drill/*`, so it can never touch `prod`. Needs `neonctl` signed in.

Why not restore `dev` itself: Neon needs a backup branch for a restore to the branch's own past, and that backup becomes the **parent** of the restored branch and of its children (`test`, the PR branches). It cannot be deleted while they exist. This happened once on 2026-11-04 (`dev-before-restore` is now the parent of `dev`, `test` and `preview/pr-12`; it holds the same data and can stay). If you ever must restore `dev` for real, use a point inside the 6-hour history window:

```sh
neonctl branches restore dev "^self@<UTC time, for example 2026-11-04T08:00:00Z>"   --project-id fancy-leaf-05807484 --preserve-under-name dev-before-restore
```

Time notes: Neon checks the time against its control plane and rejects a future time; the database clock runs about 15 seconds ahead of it, so leave a margin when you pick the point. PR branches are recreated from `dev` on every push (`database.yml`) for the same reason: `reset --parent` follows the parent, which can change.

## Smoke test (dev)

`pnpm --filter @Biz4kit/smoke smoke` runs five checks against the deployed dev stack. The Deploy workflow runs it after every dev deploy (job `smoke`) and fails the run if one fails. Inputs: `API_URL`, `SMOKE_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET` (dev previews sit behind Vercel sign-in; the bypass sets a cookie for the browser run), optional `WEB_URL`.

| # | Check |
|---|---|
| 1 | The web page loads (200) with no console error |
| 2 | API `/health` answers ok |
| 3 | The browser calls the API from the web origin with no CORS error |
| 4 | `POST /__smoke/db`: the API reads Neon as `biz4kit_app`, no bypass, RLS shows 0 workspaces |
| 5 | `POST /__smoke/queue`: a `ping` job is queued and the worker finishes it |

The `/__smoke/*` routes are off unless `SMOKE_SECRET` is set (dev only, Terraform), off when `SENTRY_ENVIRONMENT` is `production`, and need the `x-smoke-secret` header. They return counts and role names only.

## 5. Sentry (D104)

**Paused until after launch (owner, 2026-11-04):** no Sentry auth token, source maps or Sentry check in the smoke test. Two facts for when it resumes: the dev web build sends no errors because Vercel builds through Turborepo and `turbo.json` `globalEnv` lists neither `VITE_SENTRY_*` nor `SENTRY_*` (Turborepo drops unlisted variables, so the bundle has `dsn: undefined`); and `SENTRY_AUTH_TOKEN` belongs in `globalPassThroughEnv`. The Sentry slug is `biz4kit-sen` (org `biz4kit`, region de).

Free Developer plan: 5,000 errors a month, one user. Create one project for Biz4Kit and copy its DSN. No Sentry CLI is needed: the API and workers read `SENTRY_DSN` from the task definition, and the web build uploads source maps through the Vite plugin when `SENTRY_AUTH_TOKEN` is set. An empty DSN turns reporting off, which is how local dev and CI run.

Every event passes through `@Biz4kit/monitoring` first. It drops request bodies, headers, cookies and query strings, keeps only the user id, and masks emails, phone numbers, UPI IDs, GSTINs and PANs.

For Vercel PR previews, add `VITE_SENTRY_DSN` and `VITE_SENTRY_ENVIRONMENT=preview` to the Vercel project's Preview environment. For web source maps, also add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` to Vercel.

## 6. Deploys and rollback

- Branches (D118): feature PRs go into `dev`; a `dev → main` PR releases.
- Merging to `dev` deploys dev: the API and workers to ECS (Deploy workflow), the web app to `biz4kit-dev.vercel.app` (Vercel Git build).
- Merging to `main` deploys production: the web app at once (Vercel), the API and workers after the human approves the `production` environment in the Deploy run.
- To roll back the API, run **Deploy** by hand on the previous commit; to roll back the web app, promote the previous deployment in Vercel. ECR tags are immutable, so a tag always means the same build. ECS also rolls back on its own if a new revision fails its health check (circuit breaker).
- Vercel's Git integration builds every branch: `main` is the production branch, `dev` has the domain `biz4kit-dev.vercel.app`, other branches get preview links.

## 7. Vercel variables (project `biz4kit`)

| Variable | Targets | Why |
|---|---|---|
| `VITE_SERVER_URL` | Development, Preview (all branches), Preview (branch `dev`) | The web build needs the API URL (required). **Production has none yet**: set it to the production API URL before the first `main` deploy, or that build fails. |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | Development, Preview, Production; Preview on branch `dev` = `dev` | Browser reporting (paused, see Sentry) |
| `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `TEST_DATABASE_URL`, `TEST_DATABASE_MIGRATION_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | **Development only, on purpose** | Local development pulls them with `pnpm env:pull` (D112). The deployed web app is a static client plus SSR that talks to the API; the API and workers get their values from AWS Secrets Manager and the ECS task. Preview and Production builds must not hold database or queue URLs. |

Dev previews are protected by Vercel sign-in; the project has one Protection Bypass for Automation secret, copied into GitHub env `dev` as `VERCEL_AUTOMATION_BYPASS_SECRET`.

