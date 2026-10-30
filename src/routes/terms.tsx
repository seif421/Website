import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/terms")({
  head: () => pageHead("Terms of Service", "The terms that apply when you use the SentryHaus website and buy from us."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By using this website or placing an order, you agree to these terms. Please read them carefully."
      sections={[
        { heading: "Who we are", body: <><p>This website is operated by {SITE.name}. You can reach us through the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link>.</p></> },
        { heading: "Orders and prices", body: <><p>All prices are shown in US dollars unless stated otherwise. A product listing is an invitation to order, not a guarantee of availability. An order is accepted when we send you a confirmation that it has been dispatched. We may cancel an order, with a full refund, if an item is out of stock or a price was shown incorrectly.</p></> },
        { heading: "Payment", body: <><p>Payment is taken at checkout through our payment provider. We do not store your full card details.</p></> },
        { heading: "Delivery and returns", body: <><p>Delivery is described in our <Link to="/shipping" className="font-medium text-foreground underline">Shipping Policy</Link> and returns in our <Link to="/refunds" className="font-medium text-foreground underline">Refund Policy</Link>. Both form part of these terms.</p></> },
        { heading: "Security products", body: <><p>Security devices help you monitor your property but cannot prevent every incident. You are responsible for installing devices correctly and for following local laws about recording video and audio, including notifying people where required. Never point cameras at places where people expect privacy.</p></> },
        { heading: "Your account", body: <><p>Keep your login details private. You are responsible for activity on your account. We may suspend accounts that are used for fraud or abuse.</p></> },
        { heading: "Acceptable use", body: <><p>You agree not to misuse the website, attempt to break its security, or use it for anything unlawful.</p></> },
        { heading: "Liability", body: <><p>We do not exclude liability that cannot be excluded by law. Otherwise, to the extent the law allows, our liability for any order is limited to the amount you paid for it.</p></> },
        { heading: "Changes", body: <><p>We may update these terms. The version on this page when you place an order is the one that applies to that order.</p></> },
        { heading: "Contact", body: <><p>Questions about these terms? Use the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link>.</p></> },
      ]}
    />
  );
}
