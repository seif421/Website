import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Logo } from "./logo";

type FooterLink = { label: string; to: string; category?: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Smart Cameras", to: "/shop", category: "smart-cameras" },
      { label: "Doorbell Cameras", to: "/shop", category: "doorbell-cameras" },
      { label: "Smart Locks", to: "/shop", category: "smart-locks" },
      { label: "Sensors", to: "/shop", category: "motion-sensors" },
      { label: "Accessories", to: "/shop", category: "accessories" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/support" },
      { label: "Shipping Policy", to: "/shipping" },
      { label: "Refund Policy", to: "/refunds" },
      { label: "Contact Us", to: "/contact" },
      { label: "Warranty", to: "/warranty" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Reviews", to: "/reviews" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr_1.5fr]">
          <div>
            <Logo className="[&_span:last-child]:text-primary-foreground [&_span:last-child_span]:text-accent" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Premium smart home security, engineered in California. Built for families, designed for life.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid size-9 place-items-center rounded-full border border-primary-foreground/15 text-primary-foreground/80 transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-sm font-semibold tracking-wide uppercase text-primary-foreground">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        search={link.category ? { category: link.category } : undefined}
                        className="text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-6">
            <h3 className="font-display text-base font-semibold text-primary-foreground">
              Join the SentryHaus newsletter
            </h3>
            <p className="mt-2 text-sm text-primary-foreground/70">
              Early access to new products, exclusive offers, and home-security tips.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Newsletter signup"
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="h-11 flex-1 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.06] px-4 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none transition-colors focus:border-accent"
                aria-label="Email address"
              />
              <button
                type="submit"
                className="h-11 rounded-full gradient-brand px-5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.02] shadow-glow"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} SentryHaus, Inc. All rights reserved.</p>
          <p>Designed in California · Shipped from the USA</p>
        </div>
      </div>
    </footer>
  );
}