import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () =>
    pageHead(
      "Terms of Service",
      "The terms that apply when you use the Rivvo website and buy from us.",
    ),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Terms of Service")}
      intro={t("By using this website or placing an order, you agree to these terms. Please read them carefully.")}
      sections={[
        {
          heading: t("Who we are"),
          body: (
            <>
              <p>
                {t("This website is operated by {name}. You can reach us through the", { name: SITE.name })}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact form")}
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          heading: t("Orders and prices"),
          body: (
            <>
              <p>
                {t("All prices are shown in Egyptian pounds (EGP) and include any taxes unless stated otherwise. A product listing is an invitation to order, not a guarantee of availability. An order is accepted when we send you a confirmation that it has been dispatched. We may cancel an order, with a full refund, if an item is out of stock or a price was shown incorrectly.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Payment"),
          body: (
            <>
              <p>
                {t("Payment is taken at checkout through our payment provider. We do not store your full card details.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Delivery and returns"),
          body: (
            <>
              <p>
                {t("Delivery is described in our")}{" "}
                <Link to="/shipping" className="font-medium text-foreground underline">
                  {t("Shipping Policy")}
                </Link>{" "}
                {t("and returns in our")}{" "}
                <Link to="/refunds" className="font-medium text-foreground underline">
                  {t("Refund Policy")}
                </Link>
                . {t("Both form part of these terms.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Security products"),
          body: (
            <>
              <p>
                {t("Security devices help you monitor your property but cannot prevent every incident. You are responsible for installing devices correctly and for following local laws about recording video and audio, including notifying people where required. Never point cameras at places where people expect privacy.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Your account"),
          body: (
            <>
              <p>
                {t("Keep your login details private. You are responsible for activity on your account. We may suspend accounts that are used for fraud or abuse.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Acceptable use"),
          body: (
            <>
              <p>
                {t("You agree not to misuse the website, attempt to break its security, or use it for anything unlawful.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Liability"),
          body: (
            <>
              <p>
                {t("We do not exclude liability that cannot be excluded by law. Otherwise, to the extent the law allows, our liability for any order is limited to the amount you paid for it.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Changes"),
          body: (
            <>
              <p>
                {t("We may update these terms. The version on this page when you place an order is the one that applies to that order.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Contact"),
          body: (
            <>
              <p>
                {t("Questions about these terms? Use the")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact form")}
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
