---
layout: default
title: GitHub Actions Style Guide
---

# GitHub Actions Style Guide

This page outlines the style guide / coding conventions for GitHub Actions workflows within the Defra AICE team.

## Table of Contents

- [1 GitHub Actions Project Rules](#1-github-actions-project-rules)
  - [1.1 Workflow Structure](#11-workflow-structure)
    - [1.1.1 File Naming](#111-file-naming)
    - [1.1.2 Required Workflows](#112-required-workflows)
  - [1.2 Security](#12-security)
    - [1.2.1 Permissions](#121-permissions)
    - [1.2.2 Secrets](#122-secrets)
  - [1.3 Third-Party Actions](#13-third-party-actions)
  - [1.4 Security Scanning](#14-security-scanning)
    - [1.4.1 scan.yml — Reusable Scan Workflow](#141-scanyml--reusable-scan-workflow)
    - [1.4.2 Trivy Vulnerability Scanning](#142-trivy-vulnerability-scanning)
    - [1.4.3 SonarCloud Code Scanning](#143-sonarcloud-code-scanning)
    - [1.4.4 Unpinned Dependency Check](#144-unpinned-dependency-check)

## 1 GitHub Actions Project Rules

### 1.1 Workflow Structure

#### 1.1.1 File Naming

All workflow files must be placed in `.github/workflows/` at the root of the project. Workflow file names must be in kebab-case with a `.yml` extension.

Use descriptive names that reflect the workflow's purpose:

- `check-pull-request.yml` — runs checks on pull requests (linting, tests, security scan)
- `publish.yml` — builds and publishes the application on merge to `main`
- `publish-hotfix.yml` — builds and publishes a hotfix release
- `scan.yml` — reusable security scanning workflow (Trivy + SonarCloud)

#### 1.1.2 Required Workflows

All AICE projects must have at minimum the following workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `check-pull-request.yml` | `pull_request` | PR checks including security scan |
| `publish.yml` | `push` to `main` | Build and publish; security scan runs first |
| `scan.yml` | `workflow_call`, `schedule`, `workflow_dispatch` | Reusable security scanning |

`scan.yml` is a **reusable workflow** that is called by `check-pull-request.yml`, `publish.yml` and `publish-hotfix.yml`. It also runs on a nightly schedule as a standalone scan. This pattern ensures security scanning runs consistently at every stage of the delivery pipeline.

See the following for reference implementations:
- [scan.yml](https://github.com/DEFRA/ai-uc-rag-evaluation-runtime/blob/main/.github/workflows/scan.yml)
- [check-pull-request.yml](https://github.com/DEFRA/ai-uc-rag-evaluation-runtime/blob/main/.github/workflows/check-pull-request.yml)
- [publish.yml](https://github.com/DEFRA/ai-uc-rag-evaluation-runtime/blob/main/.github/workflows/publish.yml)
- [publish-hotfix.yml](https://github.com/DEFRA/ai-uc-rag-evaluation-runtime/blob/main/.github/workflows/publish-hotfix.yml)

### 1.2 Security

#### 1.2.1 Permissions

Always apply the principle of least privilege to the `GITHUB_TOKEN`. Set the default permissions to read-only at the workflow level, then grant only the specific write permissions required per job.

#### 1.2.2 Secrets

Sensitive values must always be stored as [GitHub secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) and never hardcoded in workflow files or stored as GitHub environment variables.

- Use the least-privileged credentials possible for each secret.
- Do not use structured data (JSON, YAML, etc.) as a secret value — store each sensitive value as an individual secret.
- If a secret is used to generate another sensitive value (e.g. a signed JWT from a private key), register the derived value as a secret too.
- Periodically audit and rotate registered secrets. Remove secrets that are no longer needed.

When calling reusable workflows that need secrets (e.g. `SONAR_TOKEN`), pass them with `secrets: inherit`:

```yaml
jobs:
  security-scan:
    name: Security Scanning
    uses: ./.github/workflows/scan.yml
    secrets: inherit
```

Do not hardcode secrets in workflow files:

```yaml
# Never do this
- name: Deploy
  run: ./deploy.sh --key "my-secret-api-key"
```

### 1.3 Third-Party Actions

Like with dependencies, avoid using a third-party action that can be easily replaced with a custom script or action that the project controls. For example, if you have step to check for a version bump, it's safer to implement this as a custom script that lives in the repository rather than using a third-party action that performs this check. This reduces the attack surface and ensures you have full visibility and control over the code being executed in your workflows.

Where a third-party action is necessary, pin to a specific commit SHA and monitor the action's repository for security issues or updates. If the action becomes unmaintained or has a security vulnerability, replace it with an alternative or custom implementation as soon as possible.

Before using a third-party action, audit its source code to verify it handles repository contents and secrets as expected. Prefer actions from [GitHub Verified Creators](https://github.com/marketplace?type=actions&verification=verified_creator) where possible.

For brevity, other details omitted in this reference file.
