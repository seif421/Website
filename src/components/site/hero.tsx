import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
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
            className="hidden max-h-[26rem] overflow-y-auto rounded-2xl border border-border bg-card p-2 lg:block"
          >
            <p className="px-3 pb-2 pt-2 font-display text-sm font-bold">Departments</p>
            <ul>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/shop"
                    search={{ category: c.slug }}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <CategoryThumb c={c} className="size-6 shrink-0 rounded" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <ChevronRight className="size-4 opacity-40" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <CmsLink
          href={hero.link}
          ariaLabel={hero.alt}
          className="group relative block overflow-hidden rounded-2xl bg-[#2a1b6b]"
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
          {promos.slice(0, 2).map((p, i) => {
            const img = imageUrl(p.image);
            return (
              <CmsLink
                key={i}
                href={p.link}
                className={`group relative flex min-h-[140px] flex-col justify-end overflow-hidden rounded-2xl border p-5 transition-colors hover:border-brand/50 ${
                  img ? "border-transparent text-white" : "border-border bg-surface"
                }`}
              >
                {img && (
                  <>
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </>
                )}
                <span className="relative font-display text-lg font-bold">{p.title}</span>
                <span className={`relative text-sm ${img ? "text-white/85" : "text-muted-foreground"}`}>
                  {p.text}
                </span>
              </CmsLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
