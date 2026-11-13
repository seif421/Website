import { ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSiteData } from "@/hooks/use-site-data";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/store/format";

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { brand } = useSiteData();
  const logo = imageUrl(brand.logo);
  const half = Math.ceil(brand.name.length / 2);
  return (
    <Link
      to="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label={t("{name} home", { name: brand.name })}
    >
      {logo ? (
        <img src={logo} alt={brand.name} className="h-9 w-auto max-w-40 object-contain" />
      ) : (
        <>
          <span className="grid size-9 place-items-center rounded-xl gradient-brand shadow-glow transition-transform group-hover:scale-105">
            <ShoppingBag className="size-5 text-brand-foreground" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            {brand.name.slice(0, half)}
            <span className="text-brand">{brand.name.slice(half)}</span>
          </span>
        </>
      )}
    </Link>
  );
}
