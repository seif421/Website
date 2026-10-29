import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-4 text-xs font-medium tracking-wide sm:text-sm">
        <Truck className="size-4 text-accent" aria-hidden />
        <span>Free U.S. shipping on orders over $99 · 30-day returns · 2-year warranty</span>
      </div>
    </div>
  );
}