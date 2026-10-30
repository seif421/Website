import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/refunds")({
  head: () => pageHead("Refund Policy", "Returns, refunds and exchanges at SentryHaus."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="We want you to be happy with your purchase. This policy explains how returns and refunds work."
      sections={[
        { heading: "Returns window", body: <><p>You can request a return within {SITE.returnDays} days after your order is delivered. Items must be unused, in their original packaging and with all accessories.</p></> },
        { heading: "How to return", body: <><p>Use the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link> with your order number and the reason for the return. We will reply with the return instructions and the return address. Please do not send items back before you receive them.</p></> },
        { heading: "Return shipping", body: <><p>Unless the item is faulty, damaged or not what you ordered, the cost of sending the item back is paid by the customer.</p></> },
        { heading: "Refunds", body: <><p>After we receive and inspect the returned item, we refund the item price to your original payment method. Banks usually take 5–10 business days to show the refund. Original shipping costs are refunded only if the item was faulty, damaged or incorrect.</p></> },
        { heading: "Faulty, damaged or wrong items", body: <><p>If your item arrives faulty, damaged or different from what you ordered, tell us within {SITE.returnDays} days of delivery and we will send a replacement or give a full refund, including return shipping.</p></> },
        { heading: "Items we cannot take back", body: <><p>Items that were damaged by misuse, have been installed in a way that prevents resale, or are missing parts cannot be refunded.</p></> },
        { heading: "Your legal rights", body: <><p>Nothing in this policy limits the rights you have under the consumer laws of your country.</p></> },
      ]}
    />
  );
}
