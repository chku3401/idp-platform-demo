# IDP Architecture

## Problem

With 100 microservices and 200 developers, manual onboarding creates inconsistent CI/CD pipelines, Kubernetes manifests, security controls, ownership metadata, and operational dashboards.

## Solution

Build a self-service internal developer platform that standardizes service creation.

## Main Capabilities

1. Service onboarding
2. Repository template generation
3. Namespace selection
4. CI/CD creation
5. Helm deployment
6. ArgoCD registration
7. Service catalog registration
8. RBAC and policy enforcement model
9. Observability defaults

## Developer Flow

1. Developer selects Create Service.
2. Developer enters service name, team, language, and namespace.
3. Platform validates naming and team ownership.
4. Platform generates repository structure.
5. Platform adds CI/CD workflow.
6. Platform creates Helm values.
7. Platform registers the service in GitOps.
8. Platform returns links to repo, pipeline, deployment, logs, and dashboard.

## Team Model

Example teams:

- payments
- orders
- identity
- billing
- search
- inventory
- notifications
- customer
- analytics
- platform

Each team owns dev, stage, and prod namespaces.

Example:

```text
payments-dev
payments-stage
payments-prod
```
