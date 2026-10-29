import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "reviews — SentryHaus" },
      { name: "description", content: "reviews page on SentryHaus." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-brand">Coming soon</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight capitalize">reviews</h1>
        <p className="mt-4 text-muted-foreground">This page will be built in an upcoming part of the project.</p>
      </section>
    </SiteLayout>
  );
}
