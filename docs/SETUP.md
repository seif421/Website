# Setup guide (no coding needed)

You need two free accounts: **Supabase** (the database and logins) and **Vercel** (puts the
site online). Takes about 20 minutes. Do the steps in order.

## Part 1 — Create the database (Supabase)

1. Go to https://supabase.com and sign up (the "Sign in with GitHub" button is easiest).
2. Click **New project**. Name it `sentryhaus`, choose a database password (save it somewhere
   safe), pick the region closest to your customers (for the U.S. choose *East US*), click
   **Create new project**. Wait about 2 minutes.
3. Build the tables:
   1. In the left menu click **SQL Editor** → **New query**.
   2. Open the folder `supabase/migrations` in this GitHub repo. There are 8 files with
      long numbered names.
   3. For **each file, in alphabetical order (top to bottom)**: open it on GitHub, click the
      **Copy raw file** button, paste into the SQL Editor, press **Run**. Wait for "Success"
      before the next one. The last file is `20261029120000_storage_and_hardening.sql`.
   4. If a file shows a red error, stop and send me the error text.
4. Copy your keys: left menu → **Project Settings** (gear) → **API**. You will see:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon / public key** (or "publishable key")
   - **service_role key** (click *Reveal*). This one is a **secret**: never post it publicly.
5. Allow your website's address to sign people in: **Authentication** → **URL Configuration**.
   Set **Site URL** to your website address (use `http://localhost:3000` for now, and change
   it to your real address after Part 2). Add the same address under **Redirect URLs**
   with `/**` on the end, e.g. `https://your-site.vercel.app/**`.

## Part 2 — Put the site online (Vercel)

1. Go to https://vercel.com and sign up with GitHub.
2. Click **Add New… → Project**, choose the `Website` repository, click **Import**.
3. Open **Environment Variables** and add these (name on the left, value on the right):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | the Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the anon/public key |
   | `SUPABASE_URL` | the Project URL (again) |
   | `SUPABASE_PUBLISHABLE_KEY` | the anon/public key (again) |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |

4. Click **Deploy**. When it finishes you get an address like `https://website-xxxx.vercel.app`.
   Put that address into Supabase (Part 1, step 5), replacing `localhost`.
5. If the deploy fails, open the failed deployment, copy the red error lines, and send them to me.

## Part 3 — Make yourself the owner

1. Open `https://your-site.vercel.app/auth`, click **Create account**, register, and confirm the
   email Supabase sends you.
2. Immediately open `https://your-site.vercel.app/setup-admin` and click **Claim Super Admin**.
   The first account to do this becomes the owner, so do it right away, before anyone else
   finds the page. After that the page locks itself.
3. You can now open `/admin` to manage the store.

## Later (optional)

- **Custom domain** (e.g. sentryhaus.com): Vercel project → **Settings → Domains**. Then update
  the Site URL and Redirect URLs in Supabase to the new domain.
- **Sign in with Google**: needs a Google Cloud OAuth client; ask me and I will walk you through
  it. Then set `VITE_ENABLE_GOOGLE_LOGIN` to `true` in Vercel.
- **Emails** (order confirmations, password resets): Supabase's built-in email is limited and
  only for testing. Before launch, add a real sender under Supabase → Authentication → SMTP.
- **CJ Dropshipping**: add `CJ_API_EMAIL` and `CJ_API_KEY` in Vercel when we connect it.

## Running it on your own computer (only if you want to)

Install Node.js 22 and Bun, copy `.env.example` to `.env`, fill in the five Supabase values,
then run `bun install` and `bun run dev`.
