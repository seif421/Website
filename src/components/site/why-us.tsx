import { RotateCcw, ShieldCheck, Truck, Headphones } from "lucide-react";
import { SITE } from "@/lib/site-config";

const ITEMS = [
  { icon: Truck, title: "Delivery across the US", body: `Usually ${SITE.deliveryDays} business days after dispatch.` },
  { icon: RotateCcw, title: `${SITE.returnDays}-day returns`, body: "Return unused items within the return window." },
  { icon: ShieldCheck, title: `${SITE.warrantyMonths}-month warranty`, body: "Covers manufacturing defects." },
  { icon: Headphones, title: "Real people", body: "Message us and a person replies by email." },
];

export function WhyUs() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-label="Why shop with us">
      <ul className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
