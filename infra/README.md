# infra

Terraform for AWS (Mumbai, `ap-south-1`). Uses the local AWS profile `biz4kit`; no keys in files.

```
cd infra
terraform init
terraform plan
terraform apply   # human runs this; agents have no production credentials
```

State is local for now (git-ignored). Move it to an S3 bucket with locking before a second person or CI runs Terraform.
