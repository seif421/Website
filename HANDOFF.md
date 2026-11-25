# Rivvo store - handoff (kept current as of 2026-11-25)

Owner: beginner in Cairo, Egypt (timezone Africa/Cairo). Egypt-only dropshipping/resale store "Rivvo", prices in EGP, cash on delivery, products added manually in the admin. Explain simply, keep replies short, one pull request (one merge) per feature, ask before changing the live database.

Live: https://rivvo-shop.vercel.app | Repo: seif421/Website | Vercel project "website" (prj_ohDD9ePnn6ryYgZQa6x68lxHLlUi, team team_TaaV5Fw9izu9XgL0y6lvKhsL) | Supabase project tkuokvgljrvzthjnjfew (eu-west-1)
Store email rivvo.shops@gmail.com, WhatsApp +201010540342, Instagram/Facebook @rivvo.eg. Sole supplier: Dropzawy.
Secrets (Gmail app password, Supabase service role key, Meta tokens, Gemini key, ORDER_SECRET) live in Vercel / Supabase / GitHub secrets - never in code or this file.
Stack: TanStack Start (React 19, SSR, createServerFn), Vite, Tailwind v4 (oklch tokens; hsl(var()) is invalid), shadcn/ui, recharts, bun, Nitro -> Vercel. Supabase: Postgres + RLS + SECURITY DEFINER RPCs, private schema (store_config, delivery_zones), Auth (Google), Storage (product-images, reels), Edge Functions.

## Workflow

Branch from origin/main -> commit -> push -> check Vercel preview READY (gh api repos/seif421/Website/commits/<branch>/status) -> user merges via https://github.com/seif421/Website/pull/new/<branch>.
Sandbox cannot npm install or reach the live site; verify via Vercel previews. DB changes: test in a rolled-back transaction, get the user's approval, apply with apply_migration, and keep the SQL as a file in supabase/migrations/. New columns on products need an explicit column-level GRANT SELECT (products uses column grants).
GitHub "Lint & TypeCheck" check is already red (formatting) and harmless. After changing Vercel env vars, redeploy (they apply to new deployments only). After a deploy, old browser tabs may show "This page didn't load" - a Ctrl+Shift+R / cache clear fixes it; the error page now reloads once by itself.

## Features done and live

- Shop: Shopzawy-style marketplace look, header (Home/Shop/About/Contact + category mega-menu with hover products), round category circles, deals page (?deals=true) and homepage Deals row (all discounted products), wishlist, numbered page buttons on shop/category pages, floating WhatsApp button (number from Admin > Website content > Contact; clearing it hides the button; message includes product link on product pages).
- Checkout: COD, per-governorate delivery fees (Taager rates, edited by the owner in Admin > Delivery fees), voucher codes (discount on products only, not shipping), email required, RV- order numbers. GUEST CHECKOUT is allowed since 2026-11-25 (create_cod_order accepts signed-out visitors; user_id is NULL for guests; limit 3 waiting orders per phone and per email per hour). Signed-in customers keep saved addresses and see orders in Account. Guests cannot look up orders later (no "track my order" page yet).
- Emails via Gmail SMTP (server functions + SECURITY DEFINER claim_* functions using ORDER_SECRET): order confirmation, welcome, shipped, delivered, support replies, return approval.
- Account: saved addresses, order list with images and details, return requests (footer Support -> admin Returns page). Google sign-in is live.
- Arabic/English (RTL): language button top right (cookie rivvo_lang); UI strings in src/lib/i18n/ar/*.ts (English text is the key); governorates shown as "Cairo - القاهرة"; products/categories get Arabic names automatically (products.name_ar etc.; free Google translate endpoint, cache table content_translations, ArabicFiller in __root.tsx; needs SUPABASE_SERVICE_ROLE_KEY in Vercel, set 2026-11-19; ~42/49 products were translated right after).
- Admin (English only): Dashboard, Analytics, Reports, notification bell (all live data); Products (stock column fixed, "Views" column with visitors, sort by most/fewest views, period picker - RPC admin_product_views); Dropzawy product importer (admin/dropzawy.tsx; has Default stock and per-product stock); Website content (homepage, about, contact, FAQ, social links incl. TikTok in the old "X" field), Settings, Support inbox, Returns, Delivery fees.
- Error page shows the error text and reloads once on stale-file errors.

## Social automation (free)

GitHub Actions rivvo-social-publisher.yml posts product photos to Instagram/Facebook 3x a day (08:00/14:00/20:00 UTC) through the Supabase edge function rivvo-social-publisher (Egyptian-Arabic captions from Gemini, no prices, product link included; template fallback; skips products that failed twice and retries with other photos on aspect-ratio errors).
Automatic reels (rivvo-reel-publisher.yml, scripts/make_reel.py) are PAUSED since 2026-11-20 because the owner disliked them; the workflow can still be run manually. Secrets: META_PAGE_ACCESS_TOKEN, META_IG_USER_ID, RIVVO_SOCIAL_CRON_SECRET, GEMINI_API_KEY. See docs/social-automation-setup.md.

## Known gaps / ideas (nothing here is started)

- Per-supplier delivery fees: not needed now (Dropzawy only). supabase/migrations/20261111100000_supplier_delivery.sql is old, never applied - do not apply blindly.
- Admin top search bar does nothing (owner says not needed).
- Empty categories (Health & Beauty, Office Products, 3D Controller Stands) still show in the menu.
- Dropzawy catalog CSV (13,871 products, no images/descriptions/stock) was analyzed: do NOT bulk-import without an image source. Plan: ask Dropzawy for a feed with image links, or import ~300 hand-picked products as hidden drafts.
- Ideas the owner may pick: cart-reminder emails, "Track my order" page for guests, Facebook/Instagram ad setup (ages 18-28, Instagram placements, Traffic objective), Arabic motion-graphics reels using Google Flow clips + overlays, custom domain (not bought yet), homepage wording once the owner decides what to sell.
- Old CJ import code is still present but hidden. Stale remote branches (e.g. rivvo-arabic) can be deleted; never merge rivvo-arabic.
