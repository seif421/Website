import { useState } from "react";
import { Plus, Minus } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useSiteData } from "@/hooks/use-site-data";

export function FAQ() {
  const { t } = useI18n();
  const { home } = useSiteData();
  const FAQS = home.faq;
  const [open, setOpen] = useState<number | null>(0);
  if (!home.sections.faq.show || FAQS.length === 0) return null;
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-medium text-brand">{t("FAQ")}</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {home.sections.faq.title}
        </h2>
      </div>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
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
