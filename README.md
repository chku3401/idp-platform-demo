# Internal Developer Platform Demo

A free, portfolio-ready IDP project for onboarding microservices across multiple teams.

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

## What This Project Demonstrates

- Developer self-service onboarding
- Standard microservice templates
- Namespace automation model
- Golden CI/CD pipeline
- Helm-based deployment
- GitOps application registration
- Team ownership model
- Service catalog metadata
- Policy and governance examples

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
templates/             Real, buildable Java (Spring Boot) and Node service templates
tests/                 pytest suite for the generator and API
ci/                    Golden pipeline stage reference (see .github/workflows for the real thing)
docs/                  Architecture and interview explanation
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
kubectl apply -f generated/payment-api/gitops/application.yaml
```

ArgoCD pulls `helm/service-chart` + `generated/<service>/helm/values.yaml` from this
repo's `main` branch and syncs it into the service's namespace automatically.

## Interview Story

This project shows how I would build an IDP for a company with many engineering teams. Instead of every developer manually creating repositories, pipelines, Helm charts, Kubernetes manifests, RBAC, dashboards, and ArgoCD apps, the platform gives them a self-service onboarding flow.

