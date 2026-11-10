# Rivvo store - handoff

Owner: beginner in Cairo, Egypt. Egypt-only dropshipping store "Rivvo", EGP, cash on delivery, products added manually. Explain simply, keep replies short.

Live: https://rivvo-shop.vercel.app | Repo: seif421/Website | Vercel project "website" (prj_ohDD9ePnn6ryYgZQa6x68lxHLlUi, team team_TaaV5Fw9izu9XgL0y6lvKhsL) | Supabase project tkuokvgljrvzthjnjfew
Store email rivvo.shops@gmail.com, WhatsApp +201010540342. Secrets (Gmail app password etc.) live in Vercel env vars - never in code.
Stack: TanStack Start (React 19), Tailwind v4, shadcn/ui, recharts, Supabase (RLS + SECURITY DEFINER RPCs).

## Workflow

Branch from origin/main -> commit -> push -> check Vercel preview READY -> user merges via https://github.com/seif421/Website/pull/new/<branch>.
Sandbox cannot npm install; verify builds via Vercel previews. Test DB changes with rolled-back DO blocks, then apply_migration, and keep the SQL as a repo migration file.

## Done (confirmed working)

COD checkout + per-governorate fees (Taager rates), RV- order numbers, emails (confirmation, welcome, shipped, delivered, support replies) via Gmail SMTP, sign-in required for checkout, Google sign-in, Rivvo branding/URL, Home button, hero image, warranty removed, Email Templates page hidden, admin Support inbox with email replies, live admin Dashboard/Analytics/Reports/notification bell.

## In progress

1. Per-supplier delivery fees (Taager, Go Tager, Dropzawy, Elnol Printing) + show supplier per product in admin.
   Migration written but NOT applied/tested: supabase/migrations/20261111100000_supplier_delivery.sql (branch rivvo-suppliers-search).
   Still to do: test+apply migration; Supplier column/filter and EGP prices in admin/products.index.tsx; supplier selector in admin/shipping.tsx; supplier on order lines (admin/orders.$id.tsx); delivery breakdown at checkout (checkout.index.tsx); optional Reports "Suppliers" tab. Non-Taager fees are placeholders (copies of Taager) until edited.
2. Admin top search bar (admin-topbar.tsx) is non-functional: build a debounced dropdown searching orders, customers, products, support messages (5 each; Enter opens first, Esc closes).

## Open

Homepage still security-camera themed (ask what they sell); hide old CJ/test products; Arabic/RTL not done; optional email on new contact message; supplier lead times not shown to customers (global "2-5 days").
