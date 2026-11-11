import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { Hero } from "@/components/site/hero";
import { Categories } from "@/components/site/categories";
import { ProductRow } from "@/components/site/product-row";
import { CuratedPicks } from "@/components/site/curated-picks";
import { WhyUs } from "@/components/site/why-us";
import { FAQ } from "@/components/site/faq";
import { fetchHomeRows } from "@/lib/store/queries";
import { useSiteData } from "@/hooks/use-site-data";

const DESC =
  "Shop online in Egypt. Pay cash on delivery, clear prices, honest delivery times and easy returns.";

export const Route = createFileRoute("/")({
  loader: () => fetchHomeRows(),
  head: () => ({
    meta: [
      { title: "Rivvo — Shop online in Egypt, pay on delivery" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Rivvo — Shop online in Egypt, pay on delivery" },
      { property: "og:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const { bestSellers, newest, deals } = Route.useLoaderData();
  const { home } = useSiteData();
  const sec = home.sections;
  const empty = bestSellers.length === 0 && newest.length === 0;
  return (
    <SiteLayout>
      <Hero />
      <WhyUs />
      {empty ? (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-lg font-semibold">New products are on the way.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              We are stocking the shop. Please check back soon.
            </p>
          </div>
        </section>
      ) : (
        <>
          {sec.deals.show && <ProductRow title={sec.deals.title} products={deals} seeAll={{ sort: "price-asc" }} tone="flash" />}
          <Categories />
          <CuratedPicks />
          {sec.bestSellers.show && <ProductRow title={sec.bestSellers.title} products={bestSellers} seeAll={{ sort: "rating" }} />}
          {sec.newArrivals.show && <ProductRow title={sec.newArrivals.title} products={newest} seeAll={{ sort: "newest" }} />}
        </>
      )}
      {empty && <Categories />}
      <FAQ />
    </SiteLayout>
  );
}
