import { ShieldCheck, Zap, Truck, Headphones } from "lucide-react";
import { SITE } from "@/lib/site-config";

const ITEMS = [
  { icon: ShieldCheck, title: `${SITE.returnDays}-day returns`, body: "Changed your mind or got a faulty item? Return it within the return window and we will sort it out." },
  { icon: Zap, title: "Simple to set up", body: "Products are chosen for easy installation with a phone app. Each product page lists what is in the box." },
  { icon: Truck, title: "Honest delivery times", body: `Orders are processed in ${SITE.processingDays} business days and usually arrive ${SITE.deliveryDays} business days after dispatch.` },
  { icon: Headphones, title: "Real people", body: "Send us a message and a person will reply by email." },
];

export function WhyUs() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-brand">Why SentryHaus</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Smart home security, without the guesswork.
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
