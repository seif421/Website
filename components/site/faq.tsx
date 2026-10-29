import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  { q: "Do I need a subscription to use SentryHaus products?", a: "No. Every device works fully out of the box — local storage, live view, motion alerts, and 2-way audio are all included with no monthly fee." },
  { q: "How long does shipping take?", a: "Most U.S. orders ship within 24 hours and arrive in 2–4 business days. Shipping is free on orders over $99." },
  { q: "What is your return policy?", a: "We offer a 30-day risk-free return on every product. If you're not in love, send it back for a full refund." },
  { q: "Is my video footage private?", a: "Yes. All video is end-to-end encrypted between your device and the SentryHaus app. Only you can access it." },
  { q: "Do the products work outdoors?", a: "Our outdoor cameras and doorbells are IP65-rated and engineered for rain, snow, and temperatures from -4°F to 122°F." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-medium text-brand">FAQ</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Questions, answered.
        </h2>
      </div>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-display text-base font-semibold text-foreground">{f.q}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-foreground">
                  {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}