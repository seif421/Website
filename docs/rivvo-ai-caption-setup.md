# Rivvo AI Instagram captions

The social publisher can optionally generate a fresh Egyptian Arabic + English-mix caption for each post using the OpenAI Responses API.

## Required secret

Before deploying this change, add `OPENAI_API_KEY` to the Supabase project's Edge Function secrets:

1. Open Supabase Dashboard → Edge Functions → Secrets.
2. Add `OPENAI_API_KEY` with an API key from the OpenAI API platform.
3. Keep the key private. Do not add it to GitHub, source files, frontend environment variables, or chat messages.

The key is read only by the `rivvo-social-publisher` Edge Function.

## Optional model setting

The default model is `gpt-6-luna`. To override it, add an `OPENAI_MODEL` Edge Function secret with another text model available to your API project.

## Behavior and fallback

- New product posts request a fresh caption using the product name, known price, and short description.
- Due queued posts are also given a fresh caption using their existing product copy and stored product URL.
- Rivvo appends its own call to action and exact product URL after the generated copy.
- The prompt instructs the model not to invent product features, compatibility, discounts, stock, delivery promises, or warranties.
- If the key is absent, the API times out, or generation returns an error/empty response, the publisher uses its existing caption (for queued posts) or original Arabic template (for newly selected products).
- The Meta Instagram publishing flow, product selection, daily limit, and GitHub Actions schedule are otherwise unchanged.

OpenAI API usage is billed separately from ChatGPT and requires API billing to be enabled. Consider setting a usage budget in the OpenAI API platform.
