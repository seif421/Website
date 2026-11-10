import { RotateCcw, PhoneCall, Truck, Headphones, ShieldCheck, Gift, Star, Heart, Clock } from "lucide-react";
import { useSiteData } from "@/hooks/use-site-data";

export const WHY_ICONS = {
  truck: Truck,
  rotate: RotateCcw,
  phone: PhoneCall,
  headphones: Headphones,
  shield: ShieldCheck,
  gift: Gift,
  star: Star,
  heart: Heart,
  clock: Clock,
} as const;

export function WhyUs() {
  const { home } = useSiteData();
  if (!home.sections.whyUs.show || home.whyUs.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8" aria-label={home.sections.whyUs.title}>
      <ul className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        {home.whyUs.map(({ icon, title, body }, i) => {
          const Icon = WHY_ICONS[icon as keyof typeof WHY_ICONS] ?? Star;
          return (
            <li key={i} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
