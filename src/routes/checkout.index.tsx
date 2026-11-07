import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/store/format";
import { sendOrderConfirmation } from "@/lib/store/order-email";

export const Route = createFileRoute("/checkout/")({
  head: () => ({ meta: [{ title: "Checkout — SentryHaus" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

type Zone = { governorate: string; fee: number };
type Quote = { subtotal: number; shipping: number; total: number; shipping_known: boolean };

const input =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// These database functions are new, so the generated types do not list them yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (supabase as any).rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [governorate, setGovernorate] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email!);
  }, [user]);

  useEffect(() => {
    rpc("delivery_zones").then(({ data }) => {
      if (Array.isArray(data)) setZones(data as Zone[]);
    });
  }, []);

  const items = useMemo(
    () => cart.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    [cart.items],
  );

  useEffect(() => {
    if (!cart.ready || items.length === 0) return;
    let cancelled = false;
    setQuoteError(null);
    rpc("quote_order_eg", { p_items: items, p_governorate: governorate || null }).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setQuoteError(err.message);
      else setQuote(data as Quote);
    });
    return () => {
      cancelled = true;
    };
  }, [cart.ready, items, governorate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (get("website")) return; // hidden field that only bots fill in
    setBusy(true);
    setError(null);
    const { data, error: err } = await rpc("create_cod_order", {
      p_items: items,
      p_customer: {
        full_name: get("name"),
        phone: get("phone"),
        email: get("email"),
        governorate: get("governorate"),
        city: get("city"),
        line1: get("line1"),
        line2: get("line2"),
        notes: get("notes"),
      },
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    const order = data as { order_number: string; total: number };
    cart.clear();
    // The order is already saved, so an email problem must never block the customer: wait at most 6 seconds.
    const emailed = await Promise.race([
      sendOrderConfirmation({ data: { orderNumber: order.order_number } }).then((r) => r.sent).catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 6000)),
    ]);
    navigate({ to: "/checkout/success", search: { order: order.order_number, total: order.total, emailed: emailed ? 1 : 0 } });
  }

  if (!cart.ready) {
    return (
      <SiteLayout>
        <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Loading…</p>
      </SiteLayout>
    );
  }

  if (cart.items.length === 0) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
          <Link to="/shop" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
            Continue shopping
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pay cash on delivery. We call you to confirm before we ship.</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-display text-lg font-bold">Delivery details</h2>
            <label className="block text-sm font-medium">
              Full name
              <input name="name" required minLength={3} maxLength={100} autoComplete="name" className={input} />
            </label>
            <label className="block text-sm font-medium">
              Mobile number
              <input
                name="phone"
                type="tel"
                required
                inputMode="tel"
                placeholder="01012345678"
                autoComplete="tel"
                pattern="(\+?20|0)?1[0125][0-9]{8}"
                title="An Egyptian mobile number, for example 01012345678"
                className={input}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">We will call or message you on WhatsApp to confirm.</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Governorate
                <select
                  name="governorate"
                  required
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className={input}
                >
                  <option value="" disabled>Choose…</option>
                  {zones.map((z) => (
                    <option key={z.governorate} value={z.governorate}>{z.governorate}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                City or area
                <input name="city" required minLength={2} maxLength={80} autoComplete="address-level2" className={input} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Street, building and apartment
              <input name="line1" required minLength={6} maxLength={150} autoComplete="address-line1" className={input} />
            </label>
            <label className="block text-sm font-medium">
              Landmark <span className="font-normal text-muted-foreground">(optional)</span>
              <input name="line2" maxLength={150} className={input} />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">We email your order confirmation here.</span>
            </label>
            <label className="block text-sm font-medium">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
              <textarea name="notes" rows={2} maxLength={300} className={input} />
            </label>
            {/* Hidden field: real visitors never see or fill it in. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={busy || !quote || !governorate}
              className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Placing your order…" : quote && governorate ? `Place order · ${formatMoney(quote.total)} cash on delivery` : "Place order"}
            </button>
            <p className="text-xs text-muted-foreground">
              By placing the order you agree to our <Link to="/terms" className="underline">Terms</Link>,{" "}
              <Link to="/refunds" className="underline">Refund Policy</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </form>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5" aria-label="Order summary">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {cart.items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{i.quantity} × {i.name}</span>
                </li>
              ))}
            </ul>
            {quoteError ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {quoteError} <Link to="/cart" className="underline">Back to cart</Link>
              </p>
            ) : quote ? (
              <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(quote.subtotal)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>{!quote.shipping_known ? "Choose governorate" : quote.shipping === 0 ? "Free" : formatMoney(quote.shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Pay on delivery</dt><dd>{formatMoney(quote.total)}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Calculating…</p>
            )}
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
