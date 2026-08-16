# JobFit

Paste a job description, get back which of your skills it actually asks for.

A small full-stack app: **React** front-end, **Node.js/Express** REST API,
**PostgreSQL** for the skill catalog, containerised with **Docker**, deployable
to **Kubernetes**, tested and built in **GitHub Actions**.

---

## Run it

```bash
docker compose up --build
```

Then open <http://localhost:8080>.

Run the backend tests:

```bash
cd backend && npm install && npm test
```

Deploy to a local Kubernetes cluster (Docker Desktop or kind):

```bash
docker build -t jobfit-backend:latest ./backend
docker build -t jobfit-frontend:latest ./frontend
kubectl apply -f k8s/
kubectl get pods
```

Then open <http://localhost:30080>.

---

## How it works

```
React (nginx :80)  ──/api/──▶  Express (:3001)  ──▶  Postgres (:5432)
```

1. The browser POSTs the JD text to `/api/match`.
2. nginx proxies `/api/` through to the backend service.
3. The backend loads the skill catalog from Postgres.
4. `matcher.js` tokenizes the JD and returns matched / missing / score.

---

## The interesting part: the matching algorithm

The naive way to match `m` skills against an `n`-word job description is a
nested loop — for each skill, scan every word. That is **O(n × m)**.

Instead, `matcher.js` tokenizes the JD **once** into a hash `Set`, then does a
single O(1) lookup per skill. Total: **O(n + m)**.

Multi-word skills like "github actions" would break a plain word set, so the
Set holds every 1-, 2-, and 3-word sequence (n-grams). Phrase matching stays
constant-time.

```js
const ngrams = buildNgramSet(jdText);   // O(n), done once
for (const skill of skills) {           // O(m)
  ngrams.has(skill.name);               // O(1) each
}
```

With a 500-word JD and 60 skills: 30,000 comparisons → about 560.

---

## Interview notes

Short, honest answers to the questions this project invites.

**"Why Docker here?"**
The app needs Node, nginx, and Postgres at specific versions. Without
containers, anyone running it has to install all three and match versions.
`docker compose up` gives every developer and CI the same environment. It also
means the thing I test locally is the same image that gets deployed.

**"Explain your Dockerfile."**
The backend one copies `package.json` first and installs dependencies *before*
copying source. Docker caches layers, so editing a source file doesn't
reinstall node_modules — it turns a 40-second rebuild into about 2 seconds.
It also runs as the non-root `node` user.

The frontend is a **multi-stage build**: stage one runs `npm run build` to
compile React; stage two copies only the compiled `dist/` into nginx. Node and
the source never ship to production — the image goes from ~400MB to ~25MB.

**"Why Kubernetes, for an app this size?"**
Honestly, it's overkill for the app itself — I used it to learn the deployment
model. What it buys: the backend Deployment runs 2 replicas, so if a pod dies
the Service keeps routing to the healthy one. The `livenessProbe` hits
`/api/health` and restarts a hung pod; the `readinessProbe` holds traffic back
until the pod can actually serve.

**"How does the frontend find the backend?"**
By service name, not IP. In compose, `http://backend:3001` resolves through
Docker's internal DNS; in Kubernetes the same name resolves to the backend
Service. That's why the same nginx config works in both.

**"What does your CI do?"**
Two jobs. `test` runs the unit tests. `build` builds both Docker images, and it
declares `needs: test` — so a failing test blocks the image build. Images are
tagged with the commit SHA so any build traces back to exact source.

**"What would you do next?"**
Three things: push images to a real registry instead of building locally,
move the Postgres password into a Kubernetes Secret rather than plain env vars,
and add integration tests that run against a live container rather than only
unit-testing the matcher.

---

## Layout

```
backend/
  src/matcher.js      the O(n+m) matching algorithm
  src/server.js       Express routes + error handling
  src/db.js           Postgres pool, schema, seed data
  test/               unit tests (node:test, no framework needed)
  Dockerfile
frontend/
  src/App.jsx         React UI, fetch + useState
  Dockerfile          multi-stage: build with node, serve with nginx
  nginx.conf          static files + /api proxy
k8s/                  Deployments, Services, health probes
.github/workflows/    test → build pipeline
docker-compose.yml
```
