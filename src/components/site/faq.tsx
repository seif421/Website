import { useState } from "react";
import { Plus, Minus } from "lucide-react";

import { SITE } from "@/lib/site-config";

const FAQS = [
  { q: "How long does delivery take?", a: `Orders are processed within ${SITE.processingDays} business days and usually arrive ${SITE.deliveryDays} business days after dispatch. Exact shipping costs are shown at checkout.` },
  { q: "What is your return policy?", a: `You can return an item within ${SITE.returnDays} days of delivery if it is unused and in its original packaging. See the Refund Policy for the full details.` },
  { q: "Is there a warranty?", a: `Yes. Products are covered against manufacturing defects for ${SITE.warrantyMonths} months from delivery.` },
  { q: "Do I need a subscription?", a: "Each product page explains what the device does on its own and whether any optional paid cloud features exist. Please read the product description before you buy." },
  { q: "How do I contact you?", a: "Use the contact form. A real person will reply by email." },
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