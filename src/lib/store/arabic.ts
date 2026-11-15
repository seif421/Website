import { createServerFn } from "@tanstack/react-start";

// Fills the Arabic columns of products and categories automatically, using a free translation
// service. It only ever translates text already stored in the database (no input from visitors),
// does a few rows per call, and the English text is always shown when there is no Arabic yet.

let lastRun = 0;

async function toArabic(text: string): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > 1200) {
    let cut = Math.max(rest.lastIndexOf("\n", 1200), rest.lastIndexOf(". ", 1200));
    if (cut < 200) cut = 1200;
    parts.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  parts.push(rest);
  const out: string[] = [];
  for (const part of parts) {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
      encodeURIComponent(part);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as [[string, string][]];
    const text2 = (json[0] ?? []).map((seg) => seg[0] ?? "").join("");
    if (!text2) return null;
    out.push(text2);
  }
  return out.join("");
}

/** Arabic for website content texts (FAQ, About, promos...), cached in the database. */
export const arabicTexts = createServerFn({ method: "POST" })
  .inputValidator((d: { texts: string[] }) => d)
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const texts = [...new Set(data.texts.filter((x) => typeof x === "string" && x.trim() && x.length <= 1500))].slice(0, 80);
    if (texts.length === 0) return {};
    const { createHash } = await import("node:crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const hash = (x: string) => createHash("md5").update(x).digest("hex");
    const out: Record<string, string> = {};
    const { data: hits } = await db.from("content_translations").select("src_hash, ar").in("src_hash", texts.map(hash));
    const have = new Map<string, string>(((hits ?? []) as { src_hash: string; ar: string }[]).map((r) => [r.src_hash, r.ar]));
    const missing: string[] = [];
    for (const t of texts) {
      const hit = have.get(hash(t));
      if (hit) out[t] = hit;
      else missing.push(t);
    }
    if (missing.length === 0) return out;
    // Only translate text that really is part of the website content (this is not an open translator).
    const { data: rows } = await db.from("site_content").select("value");
    const blob = JSON.stringify(rows ?? []);
    const inContent = (t: string) => blob.includes(JSON.stringify(t).slice(1, -1));
    const fresh: { src_hash: string; src: string; ar: string }[] = [];
    for (let i = 0; i < missing.length; i += 5) {
      await Promise.all(
        missing.slice(i, i + 5).map(async (t) => {
          if (!inContent(t)) return;
          const ar = await toArabic(t).catch(() => null);
          if (ar) {
            out[t] = ar;
            fresh.push({ src_hash: hash(t), src: t, ar });
          }
        }),
      );
    }
    if (fresh.length) await db.from("content_translations").upsert(fresh, { onConflict: "src_hash" });
    return out;
  });

type Row = Record<string, string | null> & { id: string };

export const fillArabic = createServerFn({ method: "POST" }).handler(async () => {
  if (Date.now() - lastRun < 15000) return { done: 0, left: -1 };
  lastRun = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as {
    from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  let done = 0;

  const run = async (table: string, fields: [string, string][], limit: number) => {
    const { data } = await db
      .from(table)
      .select(["id", ...fields.flatMap(([en, ar]) => [en, ar])].join(","))
      .is("deleted_at", null)
      .or(fields.map(([en, ar]) => `and(${en}.not.is.null,${ar}.is.null)`).join(","))
      .limit(limit);
    for (const row of (data ?? []) as Row[]) {
      const patch: Record<string, string> = {};
      for (const [en, ar] of fields) {
        const src = row[en];
        if (src !== null && src !== undefined && row[ar] == null) {
          if (!src.trim()) patch[ar] = "";
          else {
            const t = await toArabic(src).catch(() => null);
            if (t) patch[ar] = t;
          }
        }
      }
      if (Object.keys(patch).length) {
        const { error } = await db.from(table).update(patch).eq("id", row.id);
        if (!error) done++;
      }
    }
  };

  await run("categories", [["name", "name_ar"], ["description", "description_ar"]], 10);
  await run(
    "products",
    [["name", "name_ar"], ["short_description", "short_description_ar"], ["description", "description_ar"]],
    6,
  );
  return { done, left: 0 };
});
