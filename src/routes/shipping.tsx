import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, pageHead } from "@/components/site/legal-page";
import { SITE } from "@/lib/site-config";

export const Route = createFileRoute("/shipping")({
  head: () => pageHead("Shipping Policy", "How and when Rivvo orders are processed and delivered."),
  component: Page,
});

function Page() {
  return (
    <LegalPage
      title="Shipping Policy"
      intro="This page explains how we deliver your order inside Egypt. The exact delivery fee is shown at checkout before you order."
      sections={[
        {
          heading: "Confirming your order",
          body: (
            <>
              <p>
                After you place an order, we contact you by phone or WhatsApp to confirm your
                details. Please keep your phone on. Orders we cannot confirm may be cancelled.
              </p>
            </>
          ),
        },
        {
          heading: "Processing time",
          body: (
            <>
              <p>
                Confirmed orders are prepared within {SITE.processingDays} business days and handed
                to the courier. Where we have a tracking number, we send it to you.
              </p>
            </>
          ),
        },
        {
          heading: "Delivery time",
          body: (
            <>
              <p>
                Delivery usually takes {SITE.deliveryDays} business days after dispatch. Delivery
                times are estimates, not guarantees, and can be affected by public holidays, traffic
                and courier delays.
              </p>
            </>
          ),
        },
        {
          heading: "Delivery fees",
          body: (
            <>
              <p>
                The delivery fee depends on your governorate and is shown at checkout. If we offer
                free delivery above a certain order value, it is shown on the site.
              </p>
            </>
          ),
        },
        {
          heading: "Payment on delivery",
          body: (
            <>
              <p>
                You pay the courier in cash when the order arrives. Please have the exact amount
                ready. You may check the parcel in front of the courier and refuse it if it is
                damaged or not what you ordered.
              </p>
            </>
          ),
        },
        {
          heading: "Where we deliver",
          body: (
            <>
              <p>
                We deliver to the governorates listed at checkout. If yours is not listed, we cannot
                deliver there yet.
              </p>
            </>
          ),
        },
        {
          heading: "Wrong address",
          body: (
            <>
              <p>
                Please check your address carefully. If you notice a mistake,{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  contact us
                </Link>{" "}
                as soon as possible. We cannot change the address after the parcel has been
                dispatched.
              </p>
            </>
          ),
        },
        {
          heading: "Lost or damaged parcels",
          body: (
            <>
              <p>
                If your parcel is lost, or arrives damaged or incorrect,{" "}
                <Link to="/contact" className="font-medium text-foreground underline">
                  contact us
                </Link>{" "}
                with your order number and, for damage, a photo. We will arrange a replacement or
                refund.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
