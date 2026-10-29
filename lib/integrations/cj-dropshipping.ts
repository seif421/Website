/**
 * CJ Dropshipping integration layer.
 *
 * Production requires two secrets to be configured in Lovable Cloud secrets:
 *   - CJ_API_EMAIL
 *   - CJ_API_KEY
 *
 * All network calls are made from the server side (via a server function that
 * imports this module inside its handler) so the API key never reaches the
 * browser. This file therefore MUST remain server-safe: no browser APIs.
 */

const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

export type CjAuth = { accessToken: string; refreshToken: string; expiresAt: number };

let cachedAuth: CjAuth | null = null;

async function login(): Promise<CjAuth> {
  const email = process.env.CJ_API_EMAIL;
  const password = process.env.CJ_API_KEY;
  if (!email || !password) throw new Error("cj_credentials_missing");
  const res = await fetch(`${BASE_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`cj_auth_failed_${res.status}`);
  const json = (await res.json()) as {
    result: boolean;
    data?: { accessToken: string; refreshToken: string; accessTokenExpiryDate: string };
    message?: string;
  };
  if (!json.result || !json.data) throw new Error(json.message || "cj_auth_failed");
  return {
    accessToken: json.data.accessToken,
    refreshToken: json.data.refreshToken,
    expiresAt: new Date(json.data.accessTokenExpiryDate).getTime(),
  };
}

async function getAuth(): Promise<CjAuth> {
  if (cachedAuth && cachedAuth.expiresAt - 60_000 > Date.now()) return cachedAuth;
  cachedAuth = await login();
  return cachedAuth;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await getAuth();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": auth.accessToken,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`cj_request_failed_${res.status}`);
  return (await res.json()) as T;
}

export type CjProduct = {
  pid: string;
  productName: string;
  productSku: string;
  sellPrice: string;
  productImage: string;
  productImageSet?: string[];
  categoryId?: string;
  categoryName?: string;
};

export const cj = {
  ping: async () => {
    await getAuth();
    return { ok: true };
  },
  listProducts: (params: { pageNum?: number; pageSize?: number; categoryId?: string } = {}) =>
    api<{ result: boolean; data: { list: CjProduct[]; total: number } }>(
      `/product/list?pageNum=${params.pageNum ?? 1}&pageSize=${params.pageSize ?? 20}${params.categoryId ? `&categoryId=${params.categoryId}` : ""}`,
    ),
  productDetail: (pid: string) =>
    api<{ result: boolean; data: CjProduct & { description?: string; variants?: unknown[] } }>(
      `/product/query?pid=${encodeURIComponent(pid)}`,
    ),
  stock: (vids: string[]) =>
    api<{ result: boolean; data: unknown[] }>(`/product/stock/queryByVid`, {
      method: "POST",
      body: JSON.stringify({ vid: vids.join(",") }),
    }),
  createOrder: (payload: {
    orderNumber: string;
    shippingCountryCode: string;
    shippingProvince?: string;
    shippingCity?: string;
    shippingAddress: string;
    shippingZip: string;
    shippingCustomerName: string;
    shippingPhone?: string;
    email?: string;
    products: { vid: string; quantity: number }[];
  }) => api<{ result: boolean; data: { orderId: string } }>(`/shopping/order/createOrder`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  orderStatus: (orderId: string) =>
    api<{ result: boolean; data: { orderStatus: string; trackNumber?: string } }>(
      `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`,
    ),
  tracking: (trackNumber: string) =>
    api<{ result: boolean; data: unknown }>(
      `/logistic/trackQuery?trackNumber=${encodeURIComponent(trackNumber)}`,
    ),
};

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_API_EMAIL && process.env.CJ_API_KEY);
}