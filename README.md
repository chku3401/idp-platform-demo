# Internal Developer Platform Demo

An IDP project for onboarding microservices across multiple teams.

## Use Case

The organization has:

- 100 microservices
- 200 developers
- 10 teams
- Kubernetes-based deployments
- GitHub for source control
- GitHub Actions for CI/CD
- ArgoCD-style GitOps deployment

The goal is to allow any developer to onboard a new service using a standard template.

## Architecture

```text
Developer
   |
   v
Developer Portal / API
   |
   v
Service Template Generator
   |
   +--> GitHub Repository Structure
   +--> CI/CD Workflow
   +--> Helm Chart Values
   +--> Kubernetes Namespace Metadata
   +--> ArgoCD Application Manifest
   +--> Catalog Entry
```

## Repo Structure

```text
idp_platform/          Shared generator logic (used by CLI and API)
platform-api/          FastAPI self-service onboarding API (serves the UI too)
platform-ui/           Static form UI, served at platform-api's "/"
helm/service-chart/    Reusable Helm chart for services
gitops/                GitOps manifests for namespaces and apps
templates/             Real, buildable Java (Spring Boot), Node, and Python (FastAPI) service templates
tests/                 pytest suite for the generator and API
ci/                    Golden pipeline stage reference (see .github/workflows for the real thing)
docs/                  Architecture notes
scripts/               CLI wrapper around idp_platform.generator
```

## Quick Start

### Generate a service (CLI)

```bash
python3 -m venv .venv && .venv/bin/pip install -r platform-api/requirements.txt
.venv/bin/python scripts/create_service.py \
  --service-name payment-api \
  --team payments \
  --language java \
  --namespace payments-dev
```

This creates a real, buildable service under `generated/payment-api/` (Dockerfile,
source, Helm values, ArgoCD Application) plus a working GitHub Actions workflow at
`.github/workflows/payment-api.yaml`.

### Run the platform API + UI

```bash
.venv/bin/uvicorn app:app --app-dir platform-api/src --port 8000
```

Open http://localhost:8000 for the onboarding form, or call the API directly:

```bash
curl -X POST localhost:8000/services -H 'Content-Type: application/json' \
  -d '{"service_name":"notification-svc","team":"notifications","language":"node","namespace":"notifications-dev"}'
```

By default, generated files just land on disk. Set `IDP_GIT_AUTOMATION=1` to have
`POST /services` also `git add`/`commit`/`push` the new service straight to `origin`,
so the real GitHub Actions workflow and ArgoCD Application it creates actually fire:

```bash
IDP_GIT_AUTOMATION=1 .venv/bin/uvicorn app:app --app-dir platform-api/src --port 8000
```

This is off by default so the test suite (and casual local generation) never pushes
to your remote by accident.

### Run the tests

```bash
.venv/bin/pytest tests/ -v
```

### Build and run a generated service

```bash
docker build -t payment-api:local generated/payment-api
docker run -p 8080:8080 payment-api:local
curl localhost:8080/health
```

### Deploy to a local cluster via ArgoCD

```bash
kind create cluster --name idp-demo
kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f gitops/apps/generated-services-appset.yaml
```

That last command is a one-time setup step, not a per-service one. The
`generated-services` ApplicationSet watches `generated/*/helm/values.yaml` in this
repo and auto-creates (and later auto-prunes) an ArgoCD `Application` per service —
pushing a new service is enough for it to be registered and synced, no manual
`kubectl apply` per service.

Each Application renders `helm/service-chart` with that service's values and syncs
it into the service's namespace automatically.

### View how a service is performing

The catalog tab's service cards are clickable — the detail view polls
`GET /services/<name>/status` every 5s for live replica counts, pod status, CPU/memory
(via `metrics-server`), ArgoCD sync/health, and the latest GitHub Actions CI run,
straight from the cluster and GitHub. Set `IDP_KUBE_CONTEXT` if your kubeconfig's
current context isn't `kind-idp-demo`.

### Metrics and logs (Prometheus, Grafana, Loki)

```bash
kubectl apply -f gitops/apps/kube-prometheus-stack.yaml
kubectl apply -f gitops/apps/loki-stack.yaml
```

Same pattern as the ArgoCD bootstrap above — these are ArgoCD Applications pointing
at the upstream `prometheus-community` and `grafana` Helm repos, so once applied
ArgoCD installs and manages them. Gives you real historical CPU/memory per pod
(Prometheus, via `kube-state-metrics` + node-exporter) and aggregated logs across
every generated service (Loki + Promtail), both queryable from one Grafana instance:

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80
# admin / (see gitops/apps/kube-prometheus-stack.yaml's grafana.adminPassword)
```

The service detail page links directly to a Grafana Explore query scoped to that
service's namespace.

Note: `kube-prometheus-stack`'s CRDs are large enough to hit Kubernetes'
last-applied-configuration annotation size limit under a plain `kubectl apply` —
if `kubectl get prometheus -n monitoring` comes back empty after installing, apply
the chart's CRDs directly with `--server-side` first (see the ArgoCD CRD install
step above for the same fix), then restart `kube-prometheus-stack-operator` so it
picks them up.

