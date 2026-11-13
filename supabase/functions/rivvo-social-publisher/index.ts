import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rivvo-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function egyptDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function makeArabicCaption(product: { name: string; price: number; short_description?: string | null; slug: string }) {
  const description = (product.short_description ?? "").trim();
  const safeDescription = description ? `\n\n${description.slice(0, 180)}` : "";
  return [
    "✨ منتج جديد من Rivvo!",
    "",
    `🔥 ${product.name}`,
    safeDescription,
    "",
    `بسعر ${Number(product.price).toLocaleString("en-EG")} جنيه فقط`,
    "",
    "اطلبه دلوقتي من موقعنا 👇",
    `https://rivvo-shop.vercel.app/product/${product.slug}`,
    "",
    "#Rivvo #تسوق_اونلاين #مصر",
  ].filter(Boolean).join("\n");
}

async function generateAICaption(input: {
  name: string;
  productUrl: string;
  price?: number;
  description?: string | null;
  existingCaption?: string | null;
}): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-6-luna";
  const productFacts = {
    product_name: input.name,
    price_egp: typeof input.price === "number" ? input.price : null,
    product_description: input.description?.trim() || null,
    existing_product_copy: input.existingCaption?.trim() || null,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 240,
        instructions: [
          "You are Rivvo's Instagram copywriter for shoppers in Egypt.",
          "Write one original, persuasive Instagram caption in Egyptian Arabic mixed naturally with short English marketing phrases where they fit.",
          "Sound friendly, modern, confident, and conversational—not formal, robotic, or overly salesy.",
          "Use only facts explicitly present in the supplied product information. Never invent features, materials, compatibility, discounts, stock, delivery promises, warranties, or product benefits.",
          "If a price is supplied, you may mention that exact price in EGP; do not calculate or alter it.",
          "Use a few relevant emojis and include 4 to 7 relevant hashtags, including #Rivvo.",
          "Do not include a URL or a separate call-to-action; Rivvo will append its own verified product link and CTA.",
          "Avoid generic filler, repeated openings, and claims that cannot be verified.",
          "Return only the caption text, with no quotation marks, headings, explanations, or markdown fences.",
        ].join("\n"),
        input: JSON.stringify(productFacts),
      }),
    });

    if (!response.ok) {
      console.warn("AI caption API returned HTTP", response.status);
      return null;
    }

    const result = await response.json();
    const outputText = typeof result.output_text === "string"
      ? result.output_text
      : (Array.isArray(result.output) ? result.output : [])
        .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? [])
        .filter((item: { type?: string }) => item.type === "output_text")
        .map((item: { text?: string }) => item.text ?? "")
        .join("\n");

    const body = outputText
      .replace(/```[\s\S]*?```/g, "")
      .replace(/https?:\/\/\S+/gi, "")
      .trim()
      .slice(0, 1700)
      .trim();
    if (!body) return null;

    return `${body}\n\nاطلبه دلوقتي من Rivvo 🛒\n${input.productUrl}`;
  } catch (error) {
    console.warn("AI caption generation failed; using the existing caption fallback.", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

async function publishInstagram(igId: string, token: string, imageUrl: string, caption: string, version: string) {
  const create = await fetch(`https://graph.facebook.com/${version}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  });
  const container = await create.json();
  if (!create.ok || container.error || !container.id) throw new Error(container.error?.message ?? "Instagram media creation failed");

  // Meta fetches the public image asynchronously. Wait for the media container to finish processing.
  let ready = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const statusResponse = await fetch(`https://graph.facebook.com/${version}/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    const status = await statusResponse.json();
    if (status.error) throw new Error(status.error.message ?? "Instagram media processing failed");
    if (status.status_code === "FINISHED") { ready = true; break; }
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") throw new Error(`Instagram media container ${status.status_code.toLowerCase()}`);
  }
  if (!ready) throw new Error("Instagram media is still processing; retry the post later");

  const publish = await fetch(`https://graph.facebook.com/${version}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: String(container.id), access_token: token }),
  });
  const result = await publish.json();
  if (!publish.ok || result.error || !result.id) throw new Error(result.error?.message ?? "Instagram publishing failed");
  return String(result.id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const cronSecret = Deno.env.get("RIVVO_SOCIAL_CRON_SECRET");
  if (!cronSecret || req.headers.get("x-rivvo-cron-secret") !== cronSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Supabase function secrets are incomplete" }, 500);

  const pageToken = Deno.env.get("META_PAGE_ACCESS_TOKEN");
  const igId = Deno.env.get("META_IG_USER_ID");
  const version = Deno.env.get("META_GRAPH_API_VERSION") ?? "v27.0";
  if (!pageToken || !igId) return json({ error: "Meta publishing secrets are not configured" }, 503);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: settings, error: settingsError } = await db
    .from("social_automation_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (settingsError) return json({ error: settingsError.message }, 500);
  if (!settings?.enabled) return json({ ok: true, message: "Automation is paused" });

  const now = new Date();
  const today = egyptDay(now);
  const { data: recent } = await db
    .from("social_posts")
    .select("id, product_id, facebook_post_id, instagram_media_id, published_at, status")
    .in("status", ["published", "partial", "publishing"])
    .order("created_at", { ascending: false })
    .limit(100);

  const postsToday = (recent ?? []).filter((post) => post.published_at && egyptDay(new Date(post.published_at)) === today).length;
  if (postsToday >= Number(settings.max_posts_per_day ?? 1)) return json({ ok: true, message: "Daily posting limit reached" });
  if (!settings.publish_instagram) return json({ ok: true, message: "Instagram publishing is paused" });

  const usedIds = (recent ?? []).map((post) => post.product_id).filter(Boolean);
  const { data: queuedPost, error: queuedError } = await db
    .from("social_posts")
    .select("id, product_id, product_name, product_url, image_url, caption")
    .eq("status", "queued")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (queuedError) return json({ error: queuedError.message }, 500);

  let postId: string;
  let imageUrl: string;
  let caption: string;

  if (queuedPost) {
    postId = queuedPost.id;
    imageUrl = queuedPost.image_url;
    caption = await generateAICaption({
      name: queuedPost.product_name,
      productUrl: queuedPost.product_url,
      existingCaption: queuedPost.caption,
    }) ?? queuedPost.caption;
    const { error } = await db.from("social_posts").update({
      status: "publishing",
      caption,
      error_message: null,
    }).eq("id", postId);
    if (error) return json({ error: error.message }, 500);
  } else {
    const { data: products, error: productsError } = await db.from("products")
      .select("id,name,slug,price,short_description,images,created_at")
      .eq("status", "published")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (productsError) return json({ error: productsError.message }, 500);

    const candidate = (products ?? []).find((product) => {
      const images = Array.isArray(product.images) ? product.images : [];
      return !usedIds.includes(product.id) && images.some((image: unknown) => typeof image === "string" && /^https:\/\//i.test(image));
    });
    if (!candidate) return json({ ok: true, message: "No eligible unused products with public HTTPS images" });

    const images = Array.isArray(candidate.images) ? candidate.images : [];
    imageUrl = images.find((image: unknown) => typeof image === "string" && /^https:\/\//i.test(image)) as string;
    const productUrl = `https://rivvo-shop.vercel.app/product/${candidate.slug}`;
    caption = await generateAICaption({
      name: candidate.name,
      price: Number(candidate.price),
      description: candidate.short_description,
      productUrl,
    }) ?? makeArabicCaption(candidate);

    const { data: post, error: insertError } = await db.from("social_posts").insert({
      product_id: candidate.id,
      product_name: candidate.name,
      product_url: productUrl,
      image_url: imageUrl,
      caption,
      status: "publishing",
      scheduled_at: now.toISOString(),
    }).select("id").single();
    if (insertError || !post) return json({ error: insertError?.message ?? "Could not create post record" }, 500);
    postId = post.id;
  }

  let instagramMediaId: string | null = null;
  const errors: string[] = [];

  try {
    instagramMediaId = await publishInstagram(igId, pageToken, imageUrl, caption, version);
    const { error: mediaSaveError } = await db.from("social_posts")
      .update({ instagram_media_id: instagramMediaId })
      .eq("id", postId);
    if (mediaSaveError) throw new Error(mediaSaveError.message);
  } catch (error) {
    errors.push(`Instagram: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const succeeded = Boolean(instagramMediaId);
  const finalStatus = errors.length ? "failed" : "published";
  const { error: updateError } = await db.from("social_posts").update({
    status: finalStatus,
    published_at: succeeded ? new Date().toISOString() : null,
    error_message: errors.length ? errors.join("; ").slice(0, 1000) : null,
  }).eq("id", postId);

  if (succeeded) {
    await db.from("social_automation_settings").update({
      last_published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
  }
  if (updateError) return json({ error: updateError.message, post_id: postId }, 500);
  return json({ ok: succeeded, post_id: postId, status: finalStatus, errors });
});
