import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { useCart } from "@/hooks/use-cart";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/store/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Rivvo" },
      { name: "description", content: "Review the items in your Rivvo cart." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { t } = useI18n();

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("Your cart")}</h1>

        {!cart.ready ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("Loading your cart…")}</p>
        ) : cart.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="font-display text-lg font-semibold">{t("Your cart is empty.")}</p>
            <Link
              to="/shop"
              className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("Continue shopping")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {cart.items.map((item) => (
                <li key={item.productId} className="flex gap-4 p-4 sm:p-5">
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.slug }}
                    className="block size-24 shrink-0 overflow-hidden rounded-xl bg-surface"
                    aria-label={item.name}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground">
                        <ShieldCheck className="size-8 opacity-30" aria-hidden />
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/product/$slug"
                        params={{ slug: item.slug }}
                        className="font-semibold hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="font-semibold">{formatMoney(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div
                        className="inline-flex h-9 items-center rounded-full border border-input"
                        role="group"
                        aria-label={t("Quantity for {name}", { name: item.name })}
                      >
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={t("Decrease quantity")}
                          className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40"
                        >
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= 10}
                          aria-label={t("Increase quantity")}
                          className="grid size-9 place-items-center rounded-full hover:bg-surface disabled:opacity-40"
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(item.productId)}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden /> {t("Remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside
              className="h-fit rounded-2xl border border-border bg-card p-5"
              aria-label={t("Order summary")}
            >
              <h2 className="font-display text-lg font-bold">{t("Order summary")}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {cart.count === 1
                      ? t("Subtotal (1 item)")
                      : t("Subtotal ({n} items)", { n: cart.count })}
                  </dt>
                  <dd className="font-semibold">{formatMoney(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("Shipping and tax")}</dt>
                  <dd className="text-muted-foreground">{t("Shown at checkout")}</dd>
                </div>
              </dl>
              <Link
                to="/checkout"
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("Checkout")}
              </Link>
              <Link
                to="/shop"
                className="mt-3 block text-center text-sm font-medium text-brand hover:underline"
              >
                {t("Continue shopping")}
              </Link>
            </aside>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
