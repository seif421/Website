# SentryHaus — Premium Smart Home Security Store

A premium e-commerce storefront and admin dashboard for smart home security products
(cameras, doorbells, locks, sensors), built for the U.S. market on a dropshipping model
(supplier: CJ Dropshipping).

**New here? Start with [`docs/SETUP.md`](docs/SETUP.md)** — click-by-click steps to create
the database and put the site online.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start (React 19, file-based routing, SSR) + Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), lucide-react |
| Data | Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js` |
| Forms / validation | React Hook Form, Zod |
| Charts | Recharts |
| Hosting | Vercel |
| Tooling | TypeScript, ESLint, Prettier, Bun (lockfile: `bun.lock`) |

The original brief is preserved in [`docs/original-brief.md`](docs/original-brief.md);
what is still to build is in [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md).

## Project structure

```
src/
  routes/            File-based routes (storefront, auth, /_authenticated/admin/*)
  components/
    site/            Storefront components (header, footer, hero, product cards, …)
    admin/           Admin dashboard components
    ui/              shadcn/ui primitives
  hooks/             React hooks (auth, mobile, …)
  integrations/      Supabase clients and auth middleware
  lib/               Utilities, admin helpers, CJ Dropshipping client, error handling
  assets/            Bundled images
  router.tsx  server.ts  start.ts  styles.css  routeTree.gen.ts (generated)
public/              robots.txt and static files
supabase/            SQL migrations (the database definition)
docs/                Setup guide, launch checklist, original brief
```

## Run it on your computer

```sh
bun install        # or: npm install
cp .env.example .env   # then fill in the Supabase values
bun run dev            # opens on http://localhost:3000
```

Scripts: `dev`, `build`, `preview`, `lint`, `format`.

## Environment variables

See `.env.example`. Secrets that must never be committed or exposed to the browser:
`SUPABASE_SERVICE_ROLE_KEY`, `CJ_API_EMAIL`, `CJ_API_KEY`.

## Notes

- `src/routeTree.gen.ts` is generated automatically; do not edit it by hand.
- Database changes go in a new file in `supabase/migrations/` (never edit old ones).
