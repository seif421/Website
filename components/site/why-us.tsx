import { ShieldCheck, Zap, Headphones, Truck } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "End-to-end encryption", body: "Your video and data are encrypted from device to app — only you have the keys." },
  { icon: Zap, title: "5-minute setup", body: "Designed for the home, not the IT room. Just plug in and pair from the app." },
  { icon: Truck, title: "Free U.S. shipping", body: "Fast, tracked delivery on orders over $99. Most orders ship within 24 hours." },
  { icon: Headphones, title: "Real human support", body: "California-based experts, 7 days a week. No bots, no scripts." },
];

export function WhyUs() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-brand">Why SentryHaus</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Built like premium hardware. Priced like a smart upgrade.
        </h2>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated">
            <span className="grid size-11 place-items-center rounded-xl gradient-brand text-brand-foreground shadow-glow">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 font-display text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}