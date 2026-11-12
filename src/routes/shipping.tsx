import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/shipping")({
  head: () => pageHead("Shipping Policy", "How and when Rivvo orders are processed and delivered."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Shipping Policy")}
      intro={t("This page explains how we deliver your order inside Egypt. The exact delivery fee is shown at checkout before you order.")}
      sections={[
        {
          heading: t("Confirming your order"),
          body: (
            <>
              <p>
                {t("After you place an order, we contact you by phone or WhatsApp to confirm your details. Please keep your phone on. Orders we cannot confirm may be cancelled.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Processing time"),
          body: (
            <>
              <p>
                {t("Confirmed orders are prepared within {days} business days and handed to the courier. Where we have a tracking number, we send it to you.", { days: SITE.processingDays })}
              </p>
            </>
          ),
        },
        {
          heading: t("Delivery time"),
          body: (
            <>
              <p>
                {t("Delivery usually takes {days} business days after dispatch. Delivery times are estimates, not guarantees, and can be affected by public holidays, traffic and courier delays.", { days: SITE.deliveryDays })}
              </p>
            </>
          ),
        },
        {
          heading: t("Delivery fees"),
          body: (
            <>
              <p>
                {t("The delivery fee depends on your governorate and is shown at checkout. If we offer free delivery above a certain order value, it is shown on the site.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Payment on delivery"),
          body: (
            <>
              <p>
                {t("You pay the courier in cash when the order arrives. Please have the exact amount ready. You may check the parcel in front of the courier and refuse it if it is damaged or not what you ordered.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Where we deliver"),
          body: (
            <>
              <p>
                {t("We deliver to the governorates listed at checkout. If yours is not listed, we cannot deliver there yet.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Wrong address"),
          body: (
            <>
              <p>
                {t("Please check your address carefully. If you notice a mistake,")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact us")}
                </Link>{" "}
                {t("as soon as possible. We cannot change the address after the parcel has been dispatched.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Lost or damaged parcels"),
          body: (
            <>
              <p>
                {t("If your parcel is lost, or arrives damaged or incorrect,")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact us")}
                </Link>{" "}
                {t("with your order number and, for damage, a photo. We will arrange a replacement or refund.")}
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
