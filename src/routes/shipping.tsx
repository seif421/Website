import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/shipping")({
  head: () => pageHead("Shipping Policy", "How and when SentryHaus orders are processed and delivered."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Shipping Policy"
      intro="This page explains how we ship your order. Exact shipping costs and delivery estimates are shown at checkout before you pay."
      sections={[
        { heading: "Processing time", body: <><p>Orders are processed within {SITE.processingDays} business days after payment is confirmed. You will receive a confirmation email when your order has been handed to the carrier, with tracking details where available.</p></> },
        { heading: "Delivery time", body: <><p>Once dispatched, delivery usually takes {SITE.deliveryDays} business days. Delivery times are estimates, not guarantees, and can be affected by customs, carrier delays, public holidays and weather.</p></> },
        { heading: "Shipping costs", body: <><p>Shipping costs are calculated at checkout based on your address and the items in your cart. Taxes, duties or import fees, where they apply in your country, are shown at checkout or are the buyer's responsibility.</p></> },
        { heading: "Where we ship", body: <><p>We ship to the countries offered at checkout. If your country is not offered, we cannot deliver there yet.</p></> },
        { heading: "Wrong address", body: <><p>Please check your address carefully before paying. If you notice a mistake, <Link to="/contact" className="font-medium text-foreground underline">contact us</Link> as soon as possible. We cannot change the address after the parcel has been dispatched.</p></> },
        { heading: "Lost or damaged parcels", body: <><p>If your parcel is lost, or arrives damaged or incorrect, <Link to="/contact" className="font-medium text-foreground underline">contact form</Link> with your order number and, for damage, a photo. We will arrange a replacement or refund.</p></> },
      ]}
    />
  );
}
