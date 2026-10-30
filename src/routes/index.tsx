import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { Hero } from "@/components/site/hero";
import { Categories } from "@/components/site/categories";
import { FeaturedProducts } from "@/components/site/featured-products";
import { WhyUs } from "@/components/site/why-us";
import { FAQ } from "@/components/site/faq";
import { fetchFeatured } from "@/lib/store/queries";

export const Route = createFileRoute("/")({
  loader: () => fetchFeatured(4),
  head: () => ({
    meta: [
      { title: "SentryHaus — Premium Smart Home Security" },
      { name: "description", content: "Smart cameras, doorbells, locks and sensors for your home. Clear prices, honest delivery times and easy returns." },
      { property: "og:title", content: "SentryHaus — Premium Smart Home Security" },
      { property: "og:description", content: "Smart cameras, doorbells, locks and sensors for your home. Clear prices, honest delivery times and easy returns." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const products = Route.useLoaderData();
  return (
    <SiteLayout>
      <Hero />
      <Categories />
      <FeaturedProducts products={products} />
      <WhyUs />
      <FAQ />
    </SiteLayout>
  );
}
