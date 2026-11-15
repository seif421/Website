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
      <h2 className="flex items-center gap-3 font-display text-xl font-bold tracking-tight">
        <span className="h-6 w-1.5 rounded-full bg-brand" aria-hidden />
        {title}
      </h2>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
          {cats.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <CategoryThumb
                c={c}
                className="size-16 rounded-full border border-border shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-brand group-hover:shadow-elevated sm:size-20 lg:size-[88px]"
              />
              <span className="line-clamp-2 text-xs font-medium leading-tight transition-colors group-hover:text-brand sm:text-sm">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
