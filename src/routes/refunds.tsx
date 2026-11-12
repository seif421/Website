import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/refunds")({
  head: () => pageHead("Refund Policy", "Returns, refunds and exchanges at Rivvo."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Refund Policy")}
      intro={t("We want you to be happy with your purchase. This policy explains how returns and refunds work.")}
      sections={[
        {
          heading: t("Returns window"),
          body: (
            <>
              <p>
                {t("You can request a return within {days} days after your order is delivered. Items must be unused, in their original packaging and with all accessories.", { days: SITE.returnDays })}
              </p>
            </>
          ),
        },
        {
          heading: t("How to return"),
          body: (
            <>
              <p>
                {t("Use the")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact form")}
                </Link>{" "}
                {t("with your order number and the reason for the return. We will reply with the return instructions and the return address. Please do not send items back before you receive them.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Return shipping"),
          body: (
            <>
              <p>
                {t("Unless the item is faulty, damaged or not what you ordered, the cost of sending the item back is paid by the customer.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Refunds"),
          body: (
            <>
              <p>
                {t("After we receive and inspect the returned item, we refund the item price to your original payment method. Banks usually take 5–10 business days to show the refund. Original shipping costs are refunded only if the item was faulty, damaged or incorrect.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Faulty, damaged or wrong items"),
          body: (
            <>
              <p>
                {t("If your item arrives faulty, damaged or different from what you ordered, tell us within {days} days of delivery and we will send a replacement or give a full refund, including return shipping.", { days: SITE.returnDays })}
              </p>
            </>
          ),
        },
        {
          heading: t("Items we cannot take back"),
          body: (
            <>
              <p>
                {t("Items that were damaged by misuse, have been installed in a way that prevents resale, or are missing parts cannot be refunded.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Your legal rights"),
          body: (
            <>
              <p>
                {t("Nothing in this policy limits the rights you have under the consumer laws of your country.")}
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
