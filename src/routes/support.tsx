import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/support")({
  head: () => pageHead("Help Center", "Answers about orders, shipping and returns."),
  component: Page,
});

const link = "font-medium text-foreground underline";

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Help Center")}
      showUpdated={false}
      sections={[
        {
          heading: t("Where is my order?"),
          body: (
            <p>
              {t("Orders are processed within {p} business days and usually arrive {d} business days after dispatch. See the", { p: SITE.processingDays, d: SITE.deliveryDays })}{" "}
              <Link to="/shipping" className={link}>
                {t("Shipping Policy")}
              </Link>{" "}
              for details.
            </p>
          ),
        },
        {
          heading: t("How do I return something?"),
          body: (
            <p>
              {t("You have {n} days after delivery. Read the", { n: SITE.returnDays })}{" "}
              <Link to="/refunds" className={link}>
                {t("Refund Policy")}
              </Link>
              {t(", then send us your order number through the")}{" "}
              <Link to="/contact" className={link}>
                {t("contact form")}
              </Link>
              .
            </p>
          ),
        },
        {
          heading: t("My product is faulty"),
          body: (
            <p>
              {t("Tell us within {n} days of delivery.", { n: SITE.returnDays })}{" "}
              <Link to="/contact" className={link}>
                {t("Contact us")}
              </Link>{" "}
              {t("with your order number and a photo or video, and we will help you.")}
            </p>
          ),
        },
        {
          heading: t("I could not find my answer"),
          body: (
            <p>
              {t("Send us a message through the")}{" "}
              <Link to="/contact" className={link}>
                {t("contact form")}
              </Link>{" "}
              {t("and we will reply by email.")}
            </p>
          ),
        },
      ]}
    />
  );
}
