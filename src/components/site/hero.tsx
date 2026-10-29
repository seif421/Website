import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-camera.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-hero text-primary-foreground">
      <div className="absolute inset-0 opacity-30 [background:radial-gradient(60%_50%_at_70%_30%,oklch(0.78_0.13_230/0.35),transparent_60%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] px-3 py-1 text-xs font-medium tracking-wide text-accent">
            <Sparkles className="size-3.5" /> New 2026 Collection
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Security that feels<br />
            <span className="bg-gradient-to-r from-accent to-brand-foreground bg-clip-text text-transparent">
              like home.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-primary-foreground/75">
            Studio-grade smart cameras, doorbells, and locks — engineered for the way modern families live.
            Effortless setup, end-to-end encryption, no monthly fees required.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/shop"
              className="inline-flex h-12 items-center gap-2 rounded-full gradient-brand px-7 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Shop the collection <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex h-12 items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/[0.04] px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/[0.08]"
            >
              Why SentryHaus
            </Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
            <Stat k="4.9★" v="12,000+ reviews" />
            <Stat k="2-yr" v="Warranty" />
            <Stat k="E2E" v="Encrypted" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] gradient-brand opacity-25 blur-3xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] border border-primary-foreground/10 bg-primary-foreground/[0.04] shadow-elevated">
            <img
              src={heroImage}
              alt="SentryHaus outdoor smart security camera mounted on a modern home"
              width={1600}
              height={1200}
              className="aspect-[4/3] w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-xs font-medium text-foreground shadow-soft">
              <ShieldCheck className="size-4 text-brand" /> Live · Recording in 4K HDR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-display text-xl font-bold text-primary-foreground">{k}</div>
      <div className="mt-0.5 text-xs text-primary-foreground/60">{v}</div>
    </div>
  );
}