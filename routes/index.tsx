import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { Hero } from "@/components/site/hero";
import { Categories } from "@/components/site/categories";
import { FeaturedProducts } from "@/components/site/featured-products";
import { WhyUs } from "@/components/site/why-us";
import { Reviews } from "@/components/site/reviews";
import { FAQ } from "@/components/site/faq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentryHaus — Premium Smart Home Security" },
      { name: "description", content: "Studio-grade smart cameras, doorbells, locks, and sensors. Free U.S. shipping, no monthly fees, end-to-end encrypted." },
      { property: "og:title", content: "SentryHaus — Premium Smart Home Security" },
      { property: "og:description", content: "Studio-grade smart cameras, doorbells, locks, and sensors. Free U.S. shipping, no monthly fees, end-to-end encrypted." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteLayout>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <WhyUs />
      <Reviews />
      <FAQ />
    </SiteLayout>
  );
}
