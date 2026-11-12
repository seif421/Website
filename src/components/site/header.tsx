import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  LayoutDashboard,
  Home,
  Heart,
} from "lucide-react";
import { MegaMenu } from "./mega-menu";
import { useSiteData } from "@/hooks/use-site-data";
import { useEffect, useState } from "react";
import { AnnouncementBar } from "./announcement-bar";
import { Logo } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [searchCat, setSearchCat] = useState("");
  const { user, isStaff } = useAuth();
  const { count } = useCart();
  const wishlist = useWishlist();
  const site = useSiteData();
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
    navigate({ to: "/shop", search: { q: term.trim() || undefined, category: searchCat || undefined } });
  }

  return (
    <header className="sticky top-0 z-50">
      <AnnouncementBar />
      <div
        className={`border-b border-border bg-background transition-shadow ${
          scrolled ? "shadow-soft" : ""
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo />
          </div>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <form
              role="search"
              onSubmit={submitSearch}
              className="mr-2 hidden max-w-3xl flex-1 md:block"
            >
              <div className="flex h-11 overflow-hidden rounded-lg border-2 border-brand bg-background">
                <select
                  aria-label="Search in category"
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                  className="hidden max-w-[10rem] shrink-0 cursor-pointer truncate border-r border-border bg-surface px-3 text-sm text-foreground outline-none lg:block"
                >
                  <option value="">All categories</option>
                  {topCategories(site).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={site.general.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Search products"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="grid w-14 shrink-0 place-items-center bg-brand text-brand-foreground transition-colors hover:bg-brand/90"
                >
                  <Search className="size-5" aria-hidden />
                </button>
              </div>
            </form>

            {isStaff && (
              <IconLink to="/admin" label="Admin" text="Admin">
                <LayoutDashboard className="size-5" />
              </IconLink>
            )}
            <IconLink to={user ? "/account" : "/auth"} label={user ? "Account" : "Sign in"} text={user ? "Account" : "Sign in"}>
              <User className="size-5" />
            </IconLink>
            <IconLink to="/wishlist" label="Wishlist" text="Wishlist" badge={wishlist.count}>
              <Heart className="size-5" />
            </IconLink>
            <IconLink
              to="/cart"
              label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
              badge={count}
              text="Cart"
            >
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

        <div className="hidden bg-primary text-primary-foreground lg:block">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            <MegaMenu />
            <nav aria-label="Primary" className="flex items-center gap-6">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary-foreground" }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground"
              >
                <Home className="size-4" aria-hidden /> Home
              </Link>
              <Link
                to="/shop"
                search={{}}
                className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground"
              >
                Shop
              </Link>
              <Link to="/about" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">
                About
              </Link>
              <Link to="/contact" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">
                Contact
              </Link>
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
                  placeholder={site.general.searchPlaceholder}
                  className="h-10 w-full rounded-full border border-input bg-surface px-4 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  aria-label="Search products"
                />
              </form>
              <ul className="flex flex-col gap-1">
                <li>
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    <Home className="size-4" aria-hidden /> Home
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    search={{}}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    Shop
                  </Link>
                </li>
                {(["about", "contact"] as const).map((p) => (
                  <li key={p}>
                    <Link
                      to={`/${p}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium capitalize text-foreground transition-colors hover:bg-surface"
                    >
                      {p}
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
  text,
  children,
}: {
  to: string;
  label: string;
  badge?: number;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-foreground transition-colors hover:bg-surface"
    >
      <span className="relative">
        {children}
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-brand-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {text && <span className="hidden text-[11px] font-medium text-muted-foreground xl:block">{text}</span>}
    </Link>
  );
}
