import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "./categories";
import heroImage from "@/assets/hero-rivvo.webp";

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_250px]">
        <nav
          aria-label="Departments"
          className="hidden rounded-xl border border-border bg-card p-2 lg:block"
        >
          <p className="px-3 pb-1 pt-2 text-sm font-semibold">Departments</p>
          <ul>
            {CATEGORIES.map(({ label, slug, icon: Icon }) => (
              <li key={slug}>
                <Link
                  to="/shop"
                  search={{ category: slug }}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                >
                  <Icon className="size-4 text-brand" aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/shop"
          aria-label="Rivvo. Shop smarter, live better. Shop now."
          className="group relative block overflow-hidden rounded-xl bg-[#2a1b6b]"
        >
          <h1 className="sr-only">Rivvo, online store in Egypt</h1>
          <img
            src={heroImage}
            alt=""
            width={1672}
            height={941}
            fetchPriority="high"
            className="aspect-video size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </Link>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            to="/shop"
            search={{ sort: "newest" }}
            className="flex min-h-[120px] flex-col justify-end rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/50"
          >
            <span className="font-display text-lg font-bold">New arrivals</span>
            <span className="text-sm text-muted-foreground">See what just landed in the shop.</span>
          </Link>
          <Link
            to="/shop"
            search={{ sort: "price-asc" }}
            className="flex min-h-[120px] flex-col justify-end rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/50"
          >
            <span className="font-display text-lg font-bold">Lowest prices</span>
            <span className="text-sm text-muted-foreground">Start with the best value.</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
