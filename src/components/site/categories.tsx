import { FolderTree } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { topCategories, useSiteData } from "@/hooks/use-site-data";
import type { MenuCategory } from "@/lib/store/content";

export function CategoryThumb({ c, className }: { c: MenuCategory; className: string }) {
  return c.image ? (
    <img src={c.image} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-surface text-brand`}>
      <FolderTree className="size-1/2" aria-hidden />
    </span>
  );
}

export function Categories() {
  const data = useSiteData();
  const { show, title } = data.home.sections.categories;
  const cats = topCategories(data);
  if (!show || cats.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((c) => (
          <Link
            key={c.id}
            to="/shop"
            search={{ category: c.slug }}
            className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand/50"
          >
            <CategoryThumb c={c} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="p-3">
              <p className="text-sm font-semibold leading-tight">{c.name}</p>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
