import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/store/format";
import { startCheckout } from "@/lib/store/checkout";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({ cancelled: s.cancelled === "1" || s.cancelled === 1 ? true : undefined }),
  head: () => ({ meta: [{ title: "Checkout — SentryHaus" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

type Quote = { subtotal: number; shipping: number; tax: number; total: number };

const input =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email!);
  }, [user]);

  const items = useMemo(
    () => cart.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    [cart.items],
  );

  useEffect(() => {
    if (!cart.ready || items.length === 0) return;
    let cancelled = false;
    setQuoteError(null);
    // The function is new, so the generated types may not list it yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc("quote_order", { p_items: items })
      .then(({ data, error: err }: { data: Quote | null; error: { message: string } | null }) => {
        if (cancelled) return;
        if (err) setQuoteError(err.message);
        else setQuote(data);
      });
    return () => {
      cancelled = true;
    };
  }, [cart.ready, items]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const { approveUrl } = await startCheckout({
        data: {
          items,
          email: get("email"),
          accessToken: sess.session?.access_token ?? null,
          address: {
            full_name: get("name"),
            line1: get("line1"),
            line2: get("line2") || undefined,
            city: get("city"),
            state: get("state"),
            postal_code: get("zip"),
            phone: get("phone") || undefined,
          },
        },
      });
      window.location.href = approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
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
        {search.cancelled && (
          <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm" role="status">
            Payment was cancelled. Nothing was charged. You can try again below.
          </p>
        )}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-display text-lg font-bold">Delivery (United States only)</h2>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={input} />
            </label>
            <label className="block text-sm font-medium">
              Full name
              <input name="name" required maxLength={100} autoComplete="name" className={input} />
            </label>
            <label className="block text-sm font-medium">
              Address
              <input name="line1" required maxLength={150} autoComplete="address-line1" className={input} />
            </label>
            <label className="block text-sm font-medium">
              Apartment, suite, etc. <span className="font-normal text-muted-foreground">(optional)</span>
              <input name="line2" maxLength={150} autoComplete="address-line2" className={input} />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium sm:col-span-1">
                City
                <input name="city" required maxLength={80} autoComplete="address-level2" className={input} />
              </label>
              <label className="block text-sm font-medium">
                State
                <select name="state" required defaultValue="" autoComplete="address-level1" className={input}>
                  <option value="" disabled>Choose…</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                ZIP code
                <input name="zip" required pattern="\d{5}(-\d{4})?" inputMode="numeric" autoComplete="postal-code" className={input} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Phone <span className="font-normal text-muted-foreground">(optional, for the carrier)</span>
              <input name="phone" type="tel" maxLength={30} autoComplete="tel" className={input} />
            </label>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={busy || !quote}
              className="h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Taking you to PayPal…" : "Pay with PayPal"}
            </button>
            <p className="text-xs text-muted-foreground">
              You will be sent to PayPal to pay. By paying you agree to our{" "}
              <Link to="/terms" className="underline">Terms</Link>, <Link to="/refunds" className="underline">Refund Policy</Link>{" "}
              and <Link to="/privacy" className="underline">Privacy Policy</Link>.
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
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{quote.shipping === 0 ? "Free" : formatMoney(quote.shipping)}</dd></div>
                {quote.tax > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd>{formatMoney(quote.tax)}</dd></div>}
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd>{formatMoney(quote.total)}</dd></div>
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
