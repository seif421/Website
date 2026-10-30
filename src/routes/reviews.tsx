import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";

export const Route = createFileRoute("/reviews")({
  head: () => pageHead("Reviews", "Customer reviews at SentryHaus."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Reviews"
      showUpdated={false}
      sections={[
        { heading: "Reviews come from real buyers", body: <><p>We only show reviews that customers write about products they bought. You can read them at the bottom of each product page. If a product has no reviews yet, it simply has not been reviewed yet.</p></> },
        { heading: "Browse products", body: <><p><Link to="/shop" className="font-medium text-foreground underline">Go to the shop</Link> to see our products and their reviews.</p></> },
      ]}
    />
  );
}
