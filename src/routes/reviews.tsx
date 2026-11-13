import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reviews")({
  head: () => pageHead("Reviews", "Customer reviews at Rivvo."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Reviews")}
      showUpdated={false}
      sections={[
        {
          heading: t("Reviews come from real buyers"),
          body: (
            <>
              <p>
                {t(
                  "We only show reviews that customers write about products they bought. You can read them at the bottom of each product page. If a product has no reviews yet, it simply has not been reviewed yet.",
                )}
              </p>
            </>
          ),
        },
        {
          heading: t("Browse products"),
          body: (
            <>
              <p>
                <Link to="/shop" className="font-medium text-foreground underline">
                  {t("Go to the shop")}
                </Link>{" "}
                {t("to see our products and their reviews.")}
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
