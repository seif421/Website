/**
 * CJ Dropshipping API client (server only).
 * Needs one secret in the Vercel project settings: CJ_API_KEY
 * (CJ account -> Authorization -> API -> "Add API" -> copy the API Key).
 * Never import this file from browser code.
 */

const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };
let cached: Tokens | null = null;

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_API_KEY);
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.accessToken;
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error("CJ is not connected yet. Add CJ_API_KEY in Vercel settings.");
  const res = await fetch(`${BASE_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    result?: boolean;
    message?: string;
    data?: { accessToken: string; refreshToken: string; accessTokenExpiryDate: string };
  };
  if (!res.ok || !json.result || !json.data) {
    throw new Error(`CJ login failed: ${json.message ?? res.status}. Check that CJ_API_KEY is correct.`);
  }
  cached = {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    expiresAt: new Date(json.data.accessTokenExpiryDate).getTime(),
  };
  return cached.accessToken;
}

async function cjGet<T>(path: string, retry = true): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "CJ-Access-Token": token } });
  // CJ allows about 1 request per second.
  if (res.status === 429 && retry) {
    await new Promise((r) => setTimeout(r, 1200));
    return cjGet<T>(path, false);
  }
  const json = (await res.json().catch(() => ({}))) as T & { result?: boolean; message?: string };
  if (!res.ok || json.result === false) throw new Error(`CJ error: ${json.message ?? res.status}`);
  return json;
}

export type CjListItem = {
  id: string;
  nameEn: string;
  sku: string;
  bigImage: string;
  sellPrice: string | number;
  categoryId?: string;
};

export type CjVariant = {
  vid: string;
  variantNameEn?: string;
  variantSku?: string;
  variantSellPrice?: number | string;
  variantImage?: string;
  variantKey?: string;
};

export type CjDetail = {
  pid: string;
  productNameEn?: string;
  productName?: string | string[];
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[] | string;
  sellPrice?: string | number;
  categoryName?: string;
  description?: string;
  variants?: CjVariant[];
};

/** CJ sometimes returns a price range like "3.20 -- 5.10". We take the lowest number. */
export function firstPrice(v: unknown): number {
  const m = String(v ?? "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

export async function cjSearch(params: { keyword: string; page: number; size?: number; usOnly?: boolean }) {
  const q = new URLSearchParams({
    keyWord: params.keyword,
    page: String(params.page),
    size: String(params.size ?? 20),
  });
  if (params.usOnly) q.set("countryCode", "US");
  const json = await cjGet<{
    data?: { totalRecords?: number; content?: { productList?: CjListItem[] }[] };
  }>(`/product/listV2?${q.toString()}`);
  const items = (json.data?.content ?? []).flatMap((c) => c.productList ?? []);
  return { items, total: json.data?.totalRecords ?? items.length };
}

export async function cjDetail(pid: string): Promise<CjDetail> {
  const json = await cjGet<{ data?: CjDetail }>(`/product/query?pid=${encodeURIComponent(pid)}`);
  if (!json.data) throw new Error("CJ product not found.");
  return json.data;
}
