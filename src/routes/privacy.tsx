import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead("Privacy Policy", "How Rivvo collects and uses your personal data."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t("Privacy Policy")}
      intro={t("This policy explains what personal data we collect when you use our website, and what we do with it.")}
      sections={[
        {
          heading: t("What we collect"),
          body: (
            <>
              <p>
                <strong>{t("Account data:")}</strong>{" "}
                {t("your email address and password (stored securely by our authentication provider) and, if you add them, your name and addresses.")}
              </p>
              <p>
                <strong>{t("Order data:")}</strong>{" "}
                {t("items ordered, delivery address, phone number and order history.")}
              </p>
              <p>
                <strong>{t("Messages:")}</strong>{" "}
                {t("anything you send us through the contact form.")}
              </p>
              <p>
                <strong>{t("Technical data:")}</strong>{" "}
                {t("basic information your browser sends, such as IP address and device type, used to run and protect the site.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Why we use it"),
          body: (
            <>
              <p>
                {t("To create your account, process and deliver orders, take payment, answer your questions, prevent fraud, and meet legal and tax obligations.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Who we share it with"),
          body: (
            <>
              <p>
                {t("Only with services that help us run the shop: our hosting and database providers, our payment provider, carriers and fulfilment partners who need your name, address and phone number to deliver your order, and email delivery services. We do not sell your personal data.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Cookies and similar storage"),
          body: (
            <>
              <p>
                {t("We store your shopping cart and sign-in session in your browser so the site works. We do not use advertising trackers.")}
              </p>
            </>
          ),
        },
        {
          heading: t("How long we keep it"),
          body: (
            <>
              <p>
                {t("We keep order records for as long as required by tax and accounting law. Account data is kept until you ask us to delete your account.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Your rights"),
          body: (
            <>
              <p>
                {t("Depending on where you live, you can ask to see, correct, export or delete your personal data, or object to how we use it. Use the")}{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  {t("contact form")}
                </Link>{" "}
                {t("and we will respond within a reasonable time.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Security"),
          body: (
            <>
              <p>
                {t("Data is stored with reputable providers and sent over encrypted connections. No system is perfectly secure, but we take reasonable steps to protect your data.")}
              </p>
            </>
          ),
        },
        {
          heading: t("Changes"),
          body: (
            <>
              <p>{t("We may update this policy and will change the date at the top when we do.")}</p>
            </>
          ),
        },
      ]}
    />
  );
}
