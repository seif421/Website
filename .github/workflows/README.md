# GitHub Actions Workflows

## Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to `main` | Lint, type-check, test, build |
| `deploy-vercel.yml` | Push to `main` (prod) / PR (preview) | Deploy to Vercel |
| `deploy-supabase.yml` | Push to `main` (migrations changed) / Manual | Apply Supabase migrations |

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions → Repository secrets**

| Secret | Source | Description |
|--------|--------|-------------|
| `VERCEL_TOKEN` | `vercel tokens create github-actions` | Vercel CLI auth token |
| `VERCEL_ORG_ID` | `.vercel/project.json` → `orgId` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` | Vercel project ID |
| `SUPABASE_ACCESS_TOKEN` | `supabase tokens create github-actions` | Supabase CLI auth token |
| `SUPABASE_PROJECT_REF` | Supabase Dashboard → Settings → General → Reference ID | Supabase project ref (e.g., `abcdefghijklmnop`) |

## Required GitHub Variables

Go to **Settings → Secrets and variables → Actions → Variables**

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public anon key (from Supabase Dashboard → Settings → API) |

> **Note:** These are *public* values — safe to expose in build logs. Never put service_role keys here.

## One-Time Local Setup

```bash
# Vercel
npm i -g vercel@latest
vercel login
vercel link
vercel tokens create github-actions  # → VERCEL_TOKEN

# Supabase
npm i -g supabase@latest
supabase login
supabase tokens create github-actions  # → SUPABASE_ACCESS_TOKEN
# Get project ref from: https://supabase.com/dashboard/project/<ref>/settings/general
```

## How It Works

### On Push to `main`:
1. **CI** runs (lint → typecheck → test → build)
2. **Vercel Production** deploys (after CI passes)
3. **Supabase Migrations** apply (if `supabase/migrations/` changed)

### On Pull Request:
1. **CI** runs
2. **Vercel Preview** deploys (commented on PR with URL)

### Manual Migration Deploy:
Go to **Actions → Deploy Supabase Migrations → Run workflow** → choose environment.

## Adding New Migrations

```bash
# 1. Create migration locally
supabase migration new <name>

# 2. Edit the generated file in supabase/migrations/

# 3. Test locally
supabase db reset --linked

# 4. Commit & push
git add supabase/migrations/
git commit -m "db: <description>"
git push
# → GitHub Actions applies it to production
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Vercel: Missing token" | Check `VERCEL_TOKEN` secret exists and is valid |
| "Supabase: Project not found" | Verify `SUPABASE_PROJECT_REF` matches dashboard |
| "Migration failed" | Check Supabase Dashboard → Database → Migrations for logs |
| "Types not updating" | Run workflow manually or push a migration change |

## Local Development

```bash
# Start everything locally
bun run dev

# Supabase local dev (optional)
supabase start
supabase db reset
```