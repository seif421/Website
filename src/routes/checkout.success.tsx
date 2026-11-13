import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { formatMoney } from "@/lib/store/format";
import { SITE } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" && /^[A-Z0-9-]{4,30}$/i.test(s.order) ? s.order : "",
    total: Number.isFinite(Number(s.total)) ? Number(s.total) : 0,
    emailed: Number(s.emailed) === 1,
  }),
  head: () => ({
    meta: [{ title: "Order received — Rivvo" }, { name: "robots", content: "noindex" }],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { t } = useI18n();
  const { order, total, emailed } = Route.useSearch();
  const wa = SITE.whatsapp
    ? `https://wa.me/${SITE.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(t("Hello, my order number is {order}", { order }))}`
    : "";
  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">{t("Thank you, we received your order")}</h1>
        {order && (
          <p className="mt-4 text-muted-foreground">
            {t("Order number")} <strong className="text-foreground">{order}</strong>. {t("Please have")}{" "}
            <strong className="text-foreground">{formatMoney(total)}</strong>{" "}
            {t("ready to pay the courier in cash.")}
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {emailed &&
            t("We sent a confirmation to your email (check your spam folder if you do not see it).") + " "}
          {t("We will call or message you shortly to confirm your order. Delivery usually takes {days} business days after confirmation.", { days: SITE.deliveryDays })}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            {t("Continue shopping")}
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center rounded-full border border-input px-6 text-sm font-semibold"
            >
              {t("Message us on WhatsApp")}
            </a>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
