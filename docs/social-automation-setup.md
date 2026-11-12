# Rivvo social publishing setup

This feature is intentionally opt-in. The migration creates two isolated tables and does not modify products, orders, checkout, authentication, or supplier records. Do not enable automatic publishing until the Meta credentials and scheduled runner have been configured and tested.

## Meta account requirements

- Instagram must be a Business or Creator account.
- For the Facebook Login publishing flow implemented here, Instagram must be linked to the Facebook Page being managed.
- Create a Meta developer app and add the Instagram Graph API / Facebook Login products.
- Grant the app the publishing permissions needed for your own Page and Instagram professional account: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, and `instagram_content_publish`.
- Generate a Page access token for the Page that is connected to the Instagram account. The Page token is used for both publishing calls.
- Obtain the Instagram professional account ID from the Page's `instagram_business_account` field. Do not use the Instagram username as the ID.

For production use beyond app roles/testers, Meta may require App Review and Advanced Access. Complete any Page Publishing Authorization prompt in Meta Business Suite if it appears.

## Supabase Edge Function secrets

Deploy `supabase/functions/rivvo-social-publisher/index.ts` as the Edge Function named `rivvo-social-publisher` with JWT verification enabled. Configure these secrets in Supabase Edge Function secrets:

- `META_PAGE_ACCESS_TOKEN`
- `META_IG_USER_ID`
- `META_GRAPH_API_VERSION` (currently defaults to `v27.0`)
- `RIVVO_SOCIAL_CRON_SECRET` (generate a long random secret)

The Supabase Edge Function runtime provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; do not expose either in browser code.

## GitHub Actions secrets

Configure these repository Actions secrets:

- `SUPABASE_URL` — project URL, not project ref
- `SUPABASE_ANON_KEY` — publishable/anon key used only to pass the Edge Function gateway JWT check
- `RIVVO_SOCIAL_CRON_SECRET` — same random value configured in Supabase

The workflow calls the function three times per day (08:00, 14:00, and 20:00 UTC). The database setting enforces the actual daily cap (default: one post per Egypt-local day). GitHub scheduled workflows can be delayed by GitHub; they are not an exact-time SLA.

## Safe activation checklist

1. Apply the migration `20261112120000_social_automation.sql` only after reviewing the live migration history and resolving the repository's known migration-history drift.
2. Deploy the Edge Function and set the secrets above.
3. Add the GitHub Actions secrets.
4. Open Admin → Social automation and add one test product to the queue.
5. Trigger the workflow manually and confirm the Instagram media ID is recorded.
6. Only then enable the automation toggle. Leave it paused if any credential, permission, image URL, or test is uncertain.

The function only publishes single-image feed posts using public HTTPS product images. It does not publish Stories or Reels. Caption generation uses local Arabic templates; it does not call a paid AI service.
