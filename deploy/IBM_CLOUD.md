# Deploying JobFit to IBM Cloud (free tier)

IBM Cloud **Code Engine** runs containers serverless-ly and has a genuinely
free allowance — 100,000 vCPU-seconds and 200,000 GB-seconds per month, with no
credit card required on a Lite account. That is far more than this app uses.

Applying to IBM with a project running on IBM Cloud is worth the hour.

> **You have to create the account yourself** — I can't sign up on your behalf
> or enter credentials. Everything after that is scripted below.

---

## 1. Account (you do this)

1. Sign up at <https://cloud.ibm.com/registration> with your `@northeastern.edu`
   address — it qualifies for the academic tier.
2. Also check <https://www.ibm.com/academic> — IBM Academic Initiative gives
   students extra credit beyond Lite.

## 2. CLI setup

```bash
brew install --cask ibm-cloud-cli   # or: curl -fsSL https://clis.cloud.ibm.com/install/osx | sh
ibmcloud login --sso
ibmcloud plugin install code-engine container-registry
```

## 3. Push images to IBM Container Registry

```bash
ibmcloud cr region-set us-south
ibmcloud cr namespace-add jobfit
ibmcloud cr login

# Code Engine runs linux/amd64; an Apple Silicon Mac builds arm64 by default.
docker build --platform linux/amd64 -t us.icr.io/jobfit/backend:1.0 ./backend
docker build --platform linux/amd64 -t us.icr.io/jobfit/frontend:1.0 ./frontend
docker build --platform linux/amd64 -t us.icr.io/jobfit/ml:1.0 ./ml

docker push us.icr.io/jobfit/backend:1.0
docker push us.icr.io/jobfit/frontend:1.0
docker push us.icr.io/jobfit/ml:1.0
```

## 4. Create the project and database

```bash
ibmcloud ce project create --name jobfit
ibmcloud ce project select --name jobfit

# Databases for PostgreSQL has a paid minimum, so for a free-tier demo run
# Postgres as an app rather than a managed service.
ibmcloud ce app create --name db \
  --image postgres:16-alpine \
  --port 5432 \
  --env POSTGRES_USER=jobfit \
  --env POSTGRES_PASSWORD=jobfit \
  --env POSTGRES_DB=jobfit \
  --cluster-local            # not exposed to the internet
```

## 5. Deploy the services

```bash
ibmcloud ce app create --name ml \
  --image us.icr.io/jobfit/ml:1.0 \
  --port 8000 \
  --memory 1G \
  --cluster-local

ibmcloud ce app create --name backend \
  --image us.icr.io/jobfit/backend:1.0 \
  --port 3001 \
  --env PGHOST=db \
  --env PGUSER=jobfit \
  --env PGPASSWORD=jobfit \
  --env PGDATABASE=jobfit \
  --env ML_URL=http://ml.<project-namespace>.svc.cluster.local:8000 \
  --cluster-local

ibmcloud ce app create --name frontend \
  --image us.icr.io/jobfit/frontend:1.0 \
  --port 80
```

Get your public URL:

```bash
ibmcloud ce app get --name frontend --output url
```

## 6. Put the secret in a secret

The commands above pass the database password as a plain env var, which is fine
for a demo and wrong for anything real. Fix it before you show this to an
IBM engineer:

```bash
ibmcloud ce secret create --name jobfit-db --from-literal PGPASSWORD=<value>
ibmcloud ce app update --name backend --env-from-secret jobfit-db
```

---

## Interview note

**"Why Code Engine rather than a Kubernetes cluster?"**

Code Engine *is* Kubernetes — it's IBM's managed Knative layer on top of it. I
wrote raw Deployment and Service manifests (`k8s/`) to understand the primitives,
then used Code Engine to deploy, because a free-tier account doesn't justify
running a control plane for three containers. The same images run in both.

**"What did you learn?"**

Two things bit me. Code Engine runs `linux/amd64` and my Mac builds `arm64`, so
the first deploy crash-looped with an exec format error until I added
`--platform`. And `--cluster-local` matters: without it every service gets a
public URL, so my database would have been reachable from the internet.
