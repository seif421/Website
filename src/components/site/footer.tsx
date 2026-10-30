import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Logo } from "./logo";
import { SITE } from "@/lib/site-config";

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
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

export function Footer() {
  const socials = [
    { Icon: Instagram, href: SITE.social.instagram, label: "Instagram" },
    { Icon: Twitter, href: SITE.social.x, label: "X (Twitter)" },
    { Icon: Facebook, href: SITE.social.facebook, label: "Facebook" },
    { Icon: Youtube, href: SITE.social.youtube, label: "YouTube" },
  ].filter((s) => s.href);
  return (
    <footer className="mt-24 border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Logo className="[&_span:last-child]:text-primary-foreground [&_span:last-child_span]:text-accent" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
              Smart cameras, doorbells, locks and sensors for your home.
            </p>
            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-9 place-items-center rounded-full border border-primary-foreground/15 text-primary-foreground/80 transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
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

        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} SentryHaus. All rights reserved.</p>
                  </div>
      </div>
    </footer>
  );
}