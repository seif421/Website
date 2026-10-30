import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

// Server-side checkout. Runs only on the server, so the PayPal secret never reaches the browser.

export type CheckoutAddress = {
  full_name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  phone?: string;
};

export type StartInput = {
  items: { product_id: string; quantity: number }[];
  email: string;
  address: CheckoutAddress;
  accessToken?: string | null;
};

type Quote = {
  lines: { name: string; unit_price: number; quantity: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server setting: ${name}`);
  return v;
}

function db(accessToken?: string | null) {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

function paypalBase() {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Card and PayPal payments are not switched on yet. Please try again soon.");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error("[PayPal] token failed", res.status, await res.text());
    throw new Error("Could not reach PayPal. Please try again in a moment.");
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

const money = (n: number) => n.toFixed(2);

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: StartInput) => d)
  .handler(async ({ data }): Promise<{ approveUrl: string }> => {
    const supabase = db(data.accessToken);

    const { data: created, error } = await supabase.rpc("create_order", {
      p_items: data.items,
      p_email: data.email,
      p_address: data.address,
    });
    if (error) throw new Error(error.message);
    const { order_id, order_number, quote } = created as { order_id: string; order_number: string; quote: Quote };

    const token = await paypalToken();
    const origin = new URL(getRequest().url).origin;
    const currency = "USD";
    const a = data.address;

    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": order_id,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: order_number,
            invoice_id: order_number,
            custom_id: order_id,
            description: `SentryHaus order ${order_number}`,
            amount: {
              currency_code: currency,
              value: money(quote.total),
              breakdown: {
                item_total: { currency_code: currency, value: money(quote.subtotal) },
                shipping: { currency_code: currency, value: money(quote.shipping) },
                tax_total: { currency_code: currency, value: money(quote.tax) },
              },
            },
            items: quote.lines.map((l) => ({
              name: l.name.slice(0, 127),
              quantity: String(l.quantity),
              unit_amount: { currency_code: currency, value: money(l.unit_price) },
            })),
            shipping: {
              name: { full_name: a.full_name.slice(0, 300) },
              address: {
                address_line_1: a.line1.slice(0, 300),
                address_line_2: a.line2 ? a.line2.slice(0, 300) : undefined,
                admin_area_2: a.city.slice(0, 120),
                admin_area_1: a.state,
                postal_code: a.postal_code,
                country_code: "US",
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "SentryHaus",
              shipping_preference: "SET_PROVIDED_ADDRESS",
              user_action: "PAY_NOW",
              return_url: `${origin}/checkout/return`,
              cancel_url: `${origin}/checkout?cancelled=1`,
            },
          },
        },
      }),
    });
    if (!res.ok) {
      console.error("[PayPal] create order failed", res.status, await res.text());
      throw new Error("PayPal could not start the payment. Please try again.");
    }
    const pp = (await res.json()) as { id: string; links?: { rel: string; href: string }[] };
    const approve = pp.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approve) throw new Error("PayPal did not return a payment link.");

    const { error: e2 } = await supabase.rpc("set_order_paypal", {
      p_order_id: order_id,
      p_paypal_order_id: pp.id,
      p_secret: env("ORDER_SECRET"),
    });
    if (e2) throw new Error(e2.message);

    return { approveUrl: approve };
  });

export type FinishResult =
  | { ok: true; orderNumber: string; total: number; email: string }
  | { ok: false; message: string };

export const finishCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<FinishResult> => {
    if (!/^[A-Z0-9-]{8,40}$/i.test(data.token)) return { ok: false, message: "This payment link is not valid." };
    const token = await paypalToken();

    const res = await fetch(`${paypalBase()}/v2/checkout/orders/${data.token}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    let body = (await res.json().catch(() => ({}))) as PayPalOrder;
    if (!res.ok) {
      // Already captured (for example the page was refreshed): read the order instead.
      const again = await fetch(`${paypalBase()}/v2/checkout/orders/${data.token}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!again.ok) {
        console.error("[PayPal] capture failed", res.status, JSON.stringify(body));
        return { ok: false, message: "We could not confirm your payment. You have not been charged unless PayPal tells you otherwise." };
      }
      body = (await again.json()) as PayPalOrder;
    }

    const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
    if (body.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
      return { ok: false, message: "Your payment is still being processed by PayPal. We will process your order once it completes." };
    }

    const { data: paid, error } = await db().rpc("mark_order_paid", {
      p_paypal_order_id: data.token,
      p_amount: Number(capture.amount.value),
      p_currency: capture.amount.currency_code,
      p_secret: env("ORDER_SECRET"),
    });
    if (error) {
      console.error("[Checkout] mark paid failed", error.message);
      return { ok: false, message: "Your payment went through but we could not record the order. Please contact us with your PayPal receipt." };
    }
    const r = paid as { order_number: string; total: number; email: string };
    return { ok: true, orderNumber: r.order_number, total: Number(r.total), email: r.email };
  });

type PayPalOrder = {
  status?: string;
  purchase_units?: { payments?: { captures?: { status: string; amount: { value: string; currency_code: string } }[] } }[];
};
