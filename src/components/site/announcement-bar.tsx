import { Truck } from "lucide-react";
import { SITE } from "@/lib/site-config";

export function AnnouncementBar() {
  const free =
    SITE.freeShippingOver != null ? `Free delivery over ${SITE.freeShippingOver} EGP · ` : "";
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-4 text-xs font-medium tracking-wide sm:text-sm">
        <Truck className="size-4 text-accent" aria-hidden />
        <span>
          {free}Cash on delivery · {SITE.returnDays}-day returns
        </span>
      </div>
    </div>
  );
}
