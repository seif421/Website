import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/warranty")({
  head: () => pageHead("Warranty", "Warranty cover for SentryHaus products."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Warranty"
      sections={[
        { heading: "What is covered", body: <><p>Our products are covered against manufacturing defects for {SITE.warrantyMonths} months from the delivery date. If a product stops working because of a defect, we will repair it, replace it or refund you.</p></> },
        { heading: "What is not covered", body: <><p>The warranty does not cover damage from accidents, misuse, wrong installation, water damage on products not rated for it, unauthorised repairs, or normal wear and tear such as scratches.</p></> },
        { heading: "How to claim", body: <><p>Use the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link> with your order number, a short description of the problem and, if possible, a photo or video. We may ask you to try a few troubleshooting steps first.</p></> },
        { heading: "Your legal rights", body: <><p>This warranty is in addition to, and does not limit, your legal rights as a consumer.</p></> },
      ]}
    />
  );
}
