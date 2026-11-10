import { Link } from "@tanstack/react-router";
import { CmsLink } from "./cms-link";
import { CategoryThumb } from "./categories";
import { topCategories, useSiteData } from "@/hooks/use-site-data";
import { imageUrl } from "@/lib/store/format";
import defaultHero from "@/assets/hero-rivvo.webp";

export function Hero() {
  const data = useSiteData();
  const { hero, promos } = data.home;
  const cats = topCategories(data);
  const image = imageUrl(hero.image) ?? defaultHero;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className={`grid gap-4 ${cats.length > 0 ? "lg:grid-cols-[220px_1fr_250px]" : "lg:grid-cols-[1fr_250px]"}`}>
        {cats.length > 0 && (
          <nav
            aria-label="Departments"
            className="hidden max-h-[26rem] overflow-y-auto rounded-xl border border-border bg-card p-2 lg:block"
          >
            <p className="px-3 pb-1 pt-2 text-sm font-semibold">Departments</p>
            <ul>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/shop"
                    search={{ category: c.slug }}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <CategoryThumb c={c} className="size-6 shrink-0 rounded" /> {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <CmsLink
          href={hero.link}
          ariaLabel={hero.alt}
          className="group relative block overflow-hidden rounded-xl bg-[#2a1b6b]"
        >
          <h1 className="sr-only">Rivvo, online store in Egypt</h1>
          <img
            src={image}
            alt={hero.alt}
            fetchPriority="high"
            className="aspect-video size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </CmsLink>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {promos.slice(0, 2).map((p, i) => (
            <CmsLink
              key={i}
              href={p.link}
              className="flex min-h-[120px] flex-col justify-end rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/50"
            >
              <span className="font-display text-lg font-bold">{p.title}</span>
              <span className="text-sm text-muted-foreground">{p.text}</span>
            </CmsLink>
          ))}
        </div>
      </div>
    </section>
  );
}
