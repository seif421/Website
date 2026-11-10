import { supabase } from "@/integrations/supabase/client";

// Counts visits to the shop so the admin Dashboard and Analytics show real numbers.
// It stores no personal data: a random id for the visit, the page, where the visitor came from, and the device type.

type Source = "direct" | "organic" | "social" | "paid" | "referral";

const SEARCH = /(google|bing|yahoo|duckduckgo|yandex|ecosia|baidu)\./i;
const SOCIAL =
  /(facebook|fb\.com|instagram|tiktok|twitter|x\.com|t\.co|youtube|youtu\.be|whatsapp|snapchat|pinterest|linkedin|reddit|telegram)/i;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function visitId(): string {
  return safe(() => {
    let id = sessionStorage.getItem("rivvo-visit");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("rivvo-visit", id);
    }
    return id;
  }, crypto.randomUUID());
}

function classifySource(): Source {
  const params = new URLSearchParams(location.search);
  const medium = (params.get("utm_medium") ?? "").toLowerCase();
  if (["cpc", "ppc", "paid", "paidsocial", "paid_social"].includes(medium) || params.has("gclid"))
    return "paid";
  const utmSource = params.get("utm_source") ?? "";
  if (utmSource && SOCIAL.test(utmSource)) return "social";
  const ref = document.referrer;
  if (!ref) return "direct";
  const host = safe(() => new URL(ref).hostname, "");
  if (!host || host === location.hostname) return "direct";
  if (SEARCH.test(host)) return "organic";
  if (SOCIAL.test(host)) return "social";
  return "referral";
}

// The source is decided once, on the first page of a visit.
function visitSource(): Source {
  return safe(() => {
    const saved = sessionStorage.getItem("rivvo-source") as Source | null;
    if (saved) return saved;
    const s = classifySource();
    sessionStorage.setItem("rivvo-source", s);
    return s;
  }, "direct");
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

let lastPath = "";
let lastAt = 0;

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  if (
    navigator.webdriver ||
    /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)
  )
    return;
  const now = Date.now();
  if (path === lastPath && now - lastAt < 3000) return;
  lastPath = path;
  lastAt = now;
  void Promise.resolve(
    supabase.rpc(
      "track_page_view" as never,
      {
        p_session: visitId(),
        p_path: path.slice(0, 200),
        p_source: visitSource(),
        p_device: deviceType(),
      } as never,
    ),
  ).catch(() => {});
}
