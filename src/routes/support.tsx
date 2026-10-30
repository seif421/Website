import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/support")({
  head: () => pageHead("Help Center", "Answers about orders, shipping, returns and warranty."),
  component: Page,
});

const link = "font-medium text-foreground underline";

function Page() {
  return (
    <LegalPage
      title="Help Center"
      showUpdated={false}
      sections={[
        { heading: "Where is my order?", body: <p>Orders are processed within {SITE.processingDays} business days and usually arrive {SITE.deliveryDays} business days after dispatch. See the <Link to="/shipping" className={link}>Shipping Policy</Link> for details.</p> },
        { heading: "How do I return something?", body: <p>You have {SITE.returnDays} days after delivery. Read the <Link to="/refunds" className={link}>Refund Policy</Link>, then send us your order number through the <Link to="/contact" className={link}>contact form</Link>.</p> },
        { heading: "My product is faulty", body: <p>Products are covered for {SITE.warrantyMonths} months against manufacturing defects. See the <Link to="/warranty" className={link}>Warranty</Link> page and <Link to="/contact" className={link}>contact us</Link> with a photo or video.</p> },
        { heading: "I could not find my answer", body: <p>Send us a message through the <Link to="/contact" className={link}>contact form</Link> and we will reply by email.</p> },
      ]}
    />
  );
}
