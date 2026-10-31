import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { Hero } from "@/components/site/hero";
import { Categories } from "@/components/site/categories";
import { ProductRow } from "@/components/site/product-row";
import { WhyUs } from "@/components/site/why-us";
import { FAQ } from "@/components/site/faq";
import { fetchHomeRows } from "@/lib/store/queries";

const DESC = "Smart cameras, doorbells, locks and sensors for your home. Clear prices, honest delivery times and easy returns.";

export const Route = createFileRoute("/")({
  loader: () => fetchHomeRows(),
  head: () => ({
    meta: [
      { title: "SentryHaus — Home security cameras, locks and sensors" },
      { name: "description", content: DESC },
      { property: "og:title", content: "SentryHaus — Home security cameras, locks and sensors" },
      { property: "og:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const { bestSellers, newest, deals } = Route.useLoaderData();
  const empty = bestSellers.length === 0 && newest.length === 0;
  return (
    <SiteLayout>
      <Hero />
      <Categories />
      {empty ? (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">New products are on the way.</p>
            <p className="mt-2 text-sm text-muted-foreground">We are stocking the shop. Please check back soon.</p>
          </div>
        </section>
      ) : (
        <>
          <ProductRow title="Deals" products={deals} seeAll={{ sort: "price-asc" }} />
          <ProductRow title="Best sellers" products={bestSellers} seeAll={{ sort: "rating" }} />
          <ProductRow title="New arrivals" products={newest} seeAll={{ sort: "newest" }} />
        </>
      )}
      <WhyUs />
      <FAQ />
    </SiteLayout>
  );
}
