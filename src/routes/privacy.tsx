import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead("Privacy Policy", "How SentryHaus collects and uses your personal data."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal data we collect when you use our website, and what we do with it."
      sections={[
        { heading: "What we collect", body: <><p><strong>Account data:</strong> your email address and password (stored securely by our authentication provider) and, if you add them, your name and addresses.</p><p><strong>Order data:</strong> items ordered, delivery address, phone number and order history.</p><p><strong>Messages:</strong> anything you send us through the contact form.</p><p><strong>Technical data:</strong> basic information your browser sends, such as IP address and device type, used to run and protect the site.</p></> },
        { heading: "Why we use it", body: <><p>To create your account, process and deliver orders, take payment, answer your questions, prevent fraud, and meet legal and tax obligations.</p></> },
        { heading: "Who we share it with", body: <><p>Only with services that help us run the shop: our hosting and database providers, our payment provider, carriers and fulfilment partners who need your name, address and phone number to deliver your order, and email delivery services. We do not sell your personal data.</p></> },
        { heading: "Cookies and similar storage", body: <><p>We store your shopping cart and sign-in session in your browser so the site works. We do not use advertising trackers.</p></> },
        { heading: "How long we keep it", body: <><p>We keep order records for as long as required by tax and accounting law. Account data is kept until you ask us to delete your account.</p></> },
        { heading: "Your rights", body: <><p>Depending on where you live, you can ask to see, correct, export or delete your personal data, or object to how we use it. Use the <Link to="/contact" className="font-medium text-foreground underline">contact form</Link> and we will respond within a reasonable time.</p></> },
        { heading: "Security", body: <><p>Data is stored with reputable providers and sent over encrypted connections. No system is perfectly secure, but we take reasonable steps to protect your data.</p></> },
        { heading: "Changes", body: <><p>We may update this policy and will change the date at the top when we do.</p></> },
      ]}
    />
  );
}
