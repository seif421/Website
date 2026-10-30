import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/site/layout";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/store/format";
import { finishCheckout, type FinishResult } from "@/lib/store/checkout";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : undefined }),
  head: () => ({ meta: [{ title: "Order confirmation — SentryHaus" }, { name: "robots", content: "noindex" }] }),
  component: ReturnPage,
});

function ReturnPage() {
  const { token } = Route.useSearch();
  const cart = useCart();
  const [result, setResult] = useState<FinishResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setResult({ ok: false, message: "This page needs a PayPal payment. Please start again from your cart." });
      return;
    }
    finishCheckout({ data: { token } })
      .then((r) => {
        setResult(r);
        if (r.ok) cart.clear();
      })
      .catch(() => setResult({ ok: false, message: "Something went wrong while confirming your payment. Please contact us." }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        {!result ? (
          <p className="text-muted-foreground" role="status">Confirming your payment… please do not close this page.</p>
        ) : result.ok ? (
          <>
            <h1 className="font-display text-3xl font-bold">Thank you for your order!</h1>
            <p className="mt-4 text-muted-foreground">
              Your order number is <strong className="text-foreground">{result.orderNumber}</strong>. Total paid: {formatMoney(result.total)}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              PayPal sends your payment receipt to the email on your PayPal account. Keep your order number in case you need to contact us.
            </p>
            <Link to="/shop" className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
              Continue shopping
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">We could not finish your order</h1>
            <p className="mt-4 text-muted-foreground" role="alert">{result.message}</p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/cart" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Back to cart</Link>
              <Link to="/contact" className="inline-flex h-11 items-center rounded-full border border-input px-6 text-sm font-semibold">Contact us</Link>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
