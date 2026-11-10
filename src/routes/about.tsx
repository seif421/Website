import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import { pageHead } from "@/components/site/legal-page";
import { useSiteData } from "@/hooks/use-site-data";
import { imageUrl } from "@/lib/store/format";

export const Route = createFileRoute("/about")({
  head: () => pageHead("About", "About Rivvo."),
  component: Page,
});

function Page() {
  const { about } = useSiteData();
  const image = imageUrl(about.image);
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">{about.title}</h1>
        {about.intro && (
          <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{about.intro}</p>
        )}
        {image && <img src={image} alt="" className="mt-8 w-full rounded-2xl border border-border object-cover" />}
        <div className="mt-10 space-y-8">
          {about.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="font-display text-xl font-semibold">{s.heading}</h2>}
              <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Need help?{" "}
          <Link to="/contact" className="font-medium text-foreground underline">
            Contact us
          </Link>
          .
        </p>
      </article>
    </SiteLayout>
  );
}
