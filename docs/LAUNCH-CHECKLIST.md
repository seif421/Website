# SentryHaus — what is left before this can go public

Audit of the project (TanStack Start + Supabase). Based on reading the code;
the project could not be built or run in the audit environment, so every item below is a code
finding, not a runtime test. Re-verify after your first `bun run build`.

## Current state in one paragraph

The admin dashboard (about 27 pages, most wired to Supabase with row-level security) and the
authentication flow are largely built. The customer-facing store is not: the homepage exists
with hard-coded content, but 11 storefront pages are "Coming soon" stubs, and there is no
product page, no category page, no search, no working cart, no checkout and no payments.
Today a visitor cannot buy anything.

## P0 — blockers (cannot launch without these)

### Storefront pages that are stubs
`/shop`, `/cart`, `/wishlist`, `/about`, `/contact`, `/support`, `/shipping`, `/refunds`,
`/warranty`, `/terms`, `/privacy`, `/reviews` each render only "Coming soon".

### Missing pages that do not exist at all
- Product detail page (`/product/$slug`): gallery, price, stock, specs, reviews, related products.
- Category / collection pages.
- Search results page.
- Checkout and order-confirmation pages.
- Account sub-pages: orders list/detail, saved addresses, profile edit, recently viewed.
- Email-verification landing page.

### Shopping engine
- Product cards use 4 hard-coded products (`src/components/site/products.ts`); the storefront never reads the `products` table the admin edits.
- "Add to cart", wishlist hearts, header search box and the cart badge (hard-coded 0) do nothing.
- The `cart` and `wishlist` tables exist but are unused; guests have no persistent cart.
- Product cards all link to `/shop` instead of a product.

### Checkout, payments and orders
- No payment provider is integrated (Stripe/PayPal appear only as toggles in admin settings).
- Order creation must happen on the server. Right now the RLS policy lets a logged-in user insert their own order row, which means totals could be forged from the browser. Create orders in a server function, recompute prices from the database, then charge.
- Needs: shipping address + method, tax and shipping calculation, coupon and gift-card redemption, stock decrement, order confirmation email, payment webhooks.

### Dropshipping fulfilment
- `src/lib/integrations/cj-dropshipping.ts` is written but nothing calls it: no server function, no product import, no order forwarding, no stock sync, no tracking sync.
- Needs `CJ_API_EMAIL` and `CJ_API_KEY` as server secrets.

### Legal and trust content (and claims that may not be true)
- Privacy, Terms, Refund, Shipping and Warranty pages must be written (a US store also needs CCPA wording, a cookie notice and an ADA/accessibility statement).
- The site currently promises: "Designed in California", "California-based support", "ships within 24 hours", "2–4 day delivery", "2-year warranty", "end-to-end encryption", "no monthly fees". With a CJ dropshipping supply chain several of these are likely untrue or unverifiable. False claims like these create FTC and chargeback risk. Rewrite them to match what you can actually deliver.
- The homepage shows "12,000+ five-star reviews" and three named testimonials that are hard-coded. Unless these are real, remove them; fabricated reviews are illegal in the US. Replace with reviews from the `reviews` table.
- Business identity: real company name/address, support email, and phone for Contact and footer. Social links in the footer point to `#`.

### Security
- `.env` was committed to the repo (contains the Supabase project URL and publishable key; those are public-safe but the file should not be tracked). Fixed in the reorganized copy; keep real values in the host's environment settings.
- Supabase service-role key and CJ credentials must exist only as server environment variables.
- `/setup-admin` lets the first account that clicks the button become super admin. Claim it yourself immediately after deploy, and confirm it then reports "Setup already completed".
- Product images: the Drizzle migration `0001_bind_product_image_reads_to_staff.sql` removes public read access to the `product-images` bucket, so customers will not be able to see uploaded product photos. Decide between a public bucket for catalog images or signed URLs generated server-side.
- Two migration folders (`supabase/migrations` and `drizzle/migrations`) both touch policies. Confirm the deployed database matches the intended final state.

## P1 — needed for a professional launch

- Replace the admin dashboard and Analytics demo numbers with real queries. `admin/index.tsx` (sales, top products, recent orders, customers) and `admin/analytics.tsx` (random chart data) are fabricated; the top-bar notification dropdown is mock data. Customer names like "Alex Johnson" are placeholders.
- Newsletter form in the footer does nothing (`onSubmit` only prevents default). Wire it to `newsletter_subscribers`, with a confirmation email.
- Transactional email: order confirmation, shipping, password reset, welcome. The `email_templates` admin page exists but there is no sender integration.
- Admin `Support` page is "Coming soon"; the public `/support` and `/contact` need a working form or ticket flow.
- Per-page SEO: unique titles, descriptions, canonical URLs and Open Graph for every route; product pages need Product/Offer/Review structured data; stub pages currently use titles like "shop — SentryHaus". The social-share (Open Graph) image was removed; add your own.
- The sitemap was removed; generate a new one (with product URLs) once the real domain is known, and add the `Sitemap:` line back to `robots.txt`.
- Brand name inconsistency: store is "SentryHaus"; original brief and repo README said "Aegis". Pick one.
- Cookie consent and analytics (GA4 or equivalent), error monitoring (Sentry), uptime check.
- Accessibility pass: keyboard navigation, focus states, contrast, labels (the admin and auth forms need review).
- Performance pass: real product images (only 5 bundled), responsive image sizes, Lighthouse run.

## P2 — nice to have / planned in the original brief

Recently viewed, frequently bought together, product zoom, share buttons, Q&A, back-in-stock alerts, abandoned-cart emails (admin page describes them but nothing sends), Amazon / AliExpress / Zendrop integrations, multi-currency.

## Deployment

1. Follow `docs/SETUP.md` (Supabase database + Vercel hosting; Lovable is no longer used).
2. Set the environment variables listed in `.env.example` in Vercel.
3. Supabase: configure Auth redirect URLs for the production domain, set up SMTP, enable email confirmation, and add Google OAuth with your own credentials if wanted.
4. Connect a custom domain with HTTPS and update sitemap/robots/canonicals.
5. Place a test order end to end (payment, email, CJ order, tracking) before announcing.

## Suggested build order

1. Reorganized structure merged and the project building cleanly.
2. Product data from the database → shop, category, product pages.
3. Cart (guest + logged in) and search.
4. Checkout + server-side order creation + payments + emails.
5. CJ import, stock sync and order forwarding.
6. Legal pages, honest marketing copy, real reviews.
7. SEO, analytics, monitoring, accessibility, performance.
8. Real admin dashboard data, then launch.
