import { Truck } from "lucide-react";
import { SITE } from "@/lib/site-config";

export function AnnouncementBar() {
  const free = SITE.freeShippingOver != null ? `Free shipping over $${SITE.freeShippingOver} · ` : "";
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-4 text-xs font-medium tracking-wide sm:text-sm">
        <Truck className="size-4 text-accent" aria-hidden />
        <span>{free}{SITE.returnDays}-day returns · {SITE.warrantyMonths}-month warranty</span>
      </div>
    </div>
  );
}
