import type { ReactNode } from "react";
import { SiteLayout } from "@/components/site/layout";
import { SITE } from "@/lib/site-config";

export type Section = { heading: string; body: ReactNode };

export function LegalPage({
  title,
  intro,
  sections,
  showUpdated = true,
}: {
  title: string;
  intro?: ReactNode;
  sections: Section[];
  showUpdated?: boolean;
}) {
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        {showUpdated && <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.lastUpdated}</p>}
        {intro && <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>}
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-xl font-semibold">{s.heading}</h2>
              <div className="mt-2 space-y-3 leading-relaxed text-muted-foreground">{s.body}</div>
            </section>
          ))}
        </div>
      </article>
    </SiteLayout>
  );
}

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — ${SITE.name}` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — ${SITE.name}` },
      { property: "og:description", content: description },
    ],
  };
}
