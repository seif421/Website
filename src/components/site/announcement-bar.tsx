import { Truck } from "lucide-react";
import { SITE } from "@/lib/site-config";
import { useSiteData } from "@/hooks/use-site-data";

export function AnnouncementBar() {
  const { general } = useSiteData();
  const free =
    SITE.freeShippingOver != null ? `Free delivery over ${SITE.freeShippingOver} EGP · ` : "";
  if (!general.announcement.trim()) return null;
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-4 text-xs font-medium tracking-wide sm:text-sm">
        <Truck className="size-4 text-accent" aria-hidden />
        <span>
          {free}
          {general.announcement}
        </span>
      </div>
    </div>
  );
}
