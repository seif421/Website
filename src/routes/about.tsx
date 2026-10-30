import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/about")({
  head: () => pageHead("About", "About SentryHaus."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="About"
      showUpdated={false}
      sections={[
        { heading: "What we do", body: <><p>{SITE.name} sells smart home security products: cameras, doorbells, locks and sensors, chosen to be simple to set up and fair in price.</p></> },
        { heading: "How we work", body: <><p>We pick products from established manufacturers, check what we list, and ship directly to you. Delivery times and costs are shown honestly at checkout, and you can read how returns and warranty work before you buy.</p></> },
        { heading: "Talk to us", body: <><p>Questions about a product or an order? Use the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link> and a real person will reply.</p></> },
      ]}
    />
  );
}
