import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, X, LayoutDashboard, ChevronDown } from "lucide-react";
import { CATEGORIES } from "./categories";
import { useEffect, useRef, useState } from "react";
import { AnnouncementBar } from "./announcement-bar";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";

const NAV: { label: string; category?: string }[] = [
  { label: "Shop All" },
  { label: "Cameras", category: "smart-cameras" },
  { label: "Doorbells", category: "doorbell-cameras" },
  { label: "Locks", category: "smart-locks" },
  { label: "Sensors", category: "motion-sensors" },
  { label: "Accessories", category: "accessories" },
];

function Departments() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      } else if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Menu className="size-4" aria-hidden /> All categories <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-card p-2 shadow-elevated">
          <ul>
            {CATEGORIES.map(({ label, slug, icon: Icon }) => (
              <li key={slug}>
                <Link
                  to="/shop"
                  search={{ category: slug }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-surface"
                >
                  <Icon className="size-4 text-brand" aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { user, isStaff } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/shop", search: { q: term.trim() || undefined } });
  }

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
          </div>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <form role="search" onSubmit={submitSearch} className="hidden max-w-2xl flex-1 md:block">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search cameras, locks, sensors…"
                  className="h-10 w-full rounded-full border border-input bg-surface pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-brand focus:bg-background focus:ring-2 focus:ring-brand/20"
                  aria-label="Search products"
                />
              </label>
            </form>

            {isStaff && (
              <IconLink to="/admin" label="Admin"><LayoutDashboard className="size-5" /></IconLink>
            )}
            <IconLink to={user ? "/account" : "/auth"} label={user ? "Account" : "Sign in"}><User className="size-5" /></IconLink>
            <IconLink to="/cart" label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"} badge={count}>
              <ShoppingBag className="size-5" />
            </IconLink>

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

        <div className="hidden border-t border-border/60 bg-background lg:block">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            <Departments />
            <nav aria-label="Primary" className="flex items-center gap-6">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to="/shop"
                  search={item.category ? { category: item.category } : {}}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/shop" search={{ sort: "newest" }} className="text-sm font-medium text-muted-foreground hover:text-foreground">New arrivals</Link>
            </nav>
          </div>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <form role="search" onSubmit={submitSearch} className="mb-3 md:hidden">
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search products…"
                  className="h-10 w-full rounded-full border border-input bg-surface px-4 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  aria-label="Search products"
                />
              </form>
              <ul className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <li key={item.label}>
                    <Link
                      to="/shop"
                      search={item.category ? { category: item.category } : {}}
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
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
