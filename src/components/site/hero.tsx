import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "./categories";
import heroImage from "@/assets/hero-camera.jpg";

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_250px]">
        <nav aria-label="Departments" className="hidden rounded-xl border border-border bg-card p-2 lg:block">
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

        <div className="relative overflow-hidden rounded-xl gradient-hero text-primary-foreground">
          <img
            src={heroImage}
            alt=""
            width={1600}
            height={1200}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover opacity-40"
          />
          <div className="relative flex min-h-[320px] max-w-md flex-col justify-center gap-4 p-7 sm:min-h-[380px] sm:p-10">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Cameras, locks and sensors for every door.
            </h1>
            <p className="text-primary-foreground/80">
              Browse home security products with clear prices, easy returns and delivery across the United States.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-6 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
              >
                Shop all products <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

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
