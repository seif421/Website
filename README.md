# SentryHaus — Premium Smart Home Security Store

A premium e-commerce storefront and admin dashboard for smart home security products
(cameras, doorbells, locks, sensors), built for the U.S. market on a dropshipping model
(supplier: CJ Dropshipping).

Built with [Lovable](https://lovable.dev) and kept in sync with this repository.
Live preview: https://shielded-spree.lovable.app

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start (React 19, file-based routing, SSR) + Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), lucide-react |
| Data | Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js` |
| Forms / validation | React Hook Form, Zod |
| Charts | Recharts |
| Tooling | TypeScript, ESLint, Prettier, Bun (lockfile: `bun.lock`) |

> The original brief asked for Next.js; Lovable generated this project on TanStack Start instead.
> The original prompt is preserved in [`docs/original-brief.md`](docs/original-brief.md).

## Project structure

```
src/
  routes/            File-based routes (storefront, auth, /_authenticated/admin/*)
  components/
    site/            Storefront components (header, footer, hero, product cards, …)
    admin/           Admin dashboard components
    ui/              shadcn/ui primitives
  hooks/             React hooks (auth, mobile, …)
  integrations/      Supabase clients/middleware and Lovable auth
  lib/               Utilities, admin helpers, CJ Dropshipping client, error handling
  assets/            Bundled images
  router.tsx  server.ts  start.ts  styles.css  routeTree.gen.ts (generated)
public/              robots.txt, sitemap.xml, static files
supabase/            SQL migrations and config
drizzle/             Drizzle config and migrations (managed by Lovable Cloud)
docs/                Project documentation and the original brief
```

## Getting started

```sh
bun install        # or: npm install
cp .env.example .env   # then fill in your Supabase values
bun run dev
```

Scripts: `dev`, `build`, `preview`, `lint`, `format`.

## Environment variables

See `.env.example`. Server-only secrets (never commit these): `SUPABASE_SERVICE_ROLE_KEY`,
`CJ_API_EMAIL`, `CJ_API_KEY`.

## Notes for contributors

- `src/routeTree.gen.ts` is auto-generated; do not edit it by hand.
- Do not rewrite published git history; commits to `main` sync back to Lovable.
