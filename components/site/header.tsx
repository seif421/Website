import { Link } from "@tanstack/react-router";
import { Heart, Search, ShoppingBag, User, Menu, X, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { AnnouncementBar } from "./announcement-bar";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { label: "Shop All", to: "/shop" },
  { label: "Cameras", to: "/shop" },
  { label: "Doorbells", to: "/shop" },
  { label: "Locks", to: "/shop" },
  { label: "Sensors", to: "/shop" },
  { label: "Accessories", to: "/shop" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, isStaff } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <AnnouncementBar />
      <div
        className={`border-b border-border/60 backdrop-blur-xl transition-all ${
          scrolled ? "bg-background/85 shadow-soft" : "bg-background/70"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo />
            <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <div className="hidden max-w-sm flex-1 md:block">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  placeholder="Search cameras, locks, sensors…"
                  className="h-10 w-full rounded-full border border-input bg-surface pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand focus:bg-background focus:ring-2 focus:ring-brand/20"
                  aria-label="Search products"
                />
              </label>
            </div>

            {isStaff && (
              <IconLink to="/admin" label="Admin"><LayoutDashboard className="size-5" /></IconLink>
            )}
            <IconLink to={user ? "/account" : "/auth"} label={user ? "Account" : "Sign in"}><User className="size-5" /></IconLink>
            <IconLink to="/wishlist" label="Wishlist"><Heart className="size-5" /></IconLink>
            <IconLink to="/cart" label="Cart" badge={0}><ShoppingBag className="size-5" /></IconLink>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="ml-1 grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <ul className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function IconLink({
  to,
  label,
  badge,
  children,
}: {
  to: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-surface"
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}