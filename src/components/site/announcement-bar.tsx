import { Languages, Truck } from "lucide-react";
import { SITE } from "@/lib/site-config";
import { useSiteData } from "@/hooks/use-site-data";
import { useI18n } from "@/lib/i18n";

/** The thin strip at the very top: the shop announcement and the English / Arabic switch. */
export function AnnouncementBar() {
  const { general } = useSiteData();
  const { t, chosen, setLang } = useI18n();
  const free =
    SITE.freeShippingOver != null
      ? `${t("Free delivery over {n} EGP", { n: SITE.freeShippingOver })} · `
      : "";
  const hasText = general.announcement.trim() !== "";
  return (
    <div className="relative bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-24 text-xs font-medium sm:text-sm">
        {hasText && (
          <>
            <Truck className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="truncate">
              {free}
              {general.announcement}
            </span>
          </>
        )}
      </div>
      {/* Always on the right-hand side of the screen, in both languages. */}
      <button
        type="button"
        dir="ltr"
        onClick={() => setLang(chosen === "ar" ? "en" : "ar")}
        aria-label={chosen === "ar" ? "Switch to English" : "التبديل إلى العربية"}
        className="absolute right-3 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-white/25 sm:right-4"
      >
        <Languages className="size-3.5" aria-hidden />
        {chosen === "ar" ? "English" : "العربية"}
      </button>
    </div>
  );
}
