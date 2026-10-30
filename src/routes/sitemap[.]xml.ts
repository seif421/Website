import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const STATIC_PAGES = ["/", "/shop", "/about", "/contact", "/support", "/shipping", "/refunds", "/warranty", "/terms", "/privacy"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin;
        const urls: { loc: string; lastmod?: string }[] = STATIC_PAGES.map((p) => ({ loc: origin + p }));

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
          const db = createClient(url, key, { auth: { persistSession: false } });
          const [{ data: products }, { data: cats }] = await Promise.all([
            db.from("products").select("slug,updated_at").eq("is_active", true).eq("status", "published").is("deleted_at", null).limit(5000),
            db.from("categories").select("slug").is("deleted_at", null).limit(500),
          ]);
          for (const c of cats ?? []) urls.push({ loc: `${origin}/shop?category=${encodeURIComponent(c.slug)}` });
          for (const p of products ?? []) {
            urls.push({
              loc: `${origin}/product/${encodeURIComponent(p.slug)}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
            });
          }
        }

        const body =
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n") +
          `\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
