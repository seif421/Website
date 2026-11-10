import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const PAGES = ["/", "/about", "/contact", "/cart", "/shipping", "/refunds", "/support", "/reviews", "/wishlist", "/privacy", "/terms"];

/** A link whose address was typed in the admin, for example "/shop?category=watches". */
export function CmsLink({
  href,
  className,
  children,
  ariaLabel,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  const value = (href || "/shop").trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) {
    return (
      <a href={value} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {children}
      </a>
    );
  }
  let url: URL;
  try {
    url = new URL(value.startsWith("/") ? value : `/${value}`, "http://x");
  } catch {
    return <a href="/shop" className={className}>{children}</a>;
  }
  if (url.pathname === "/shop") {
    const search: Record<string, string> = {};
    for (const k of ["category", "sort", "q"]) {
      const v = url.searchParams.get(k);
      if (v) search[k] = v;
    }
    return (
      <Link to="/shop" search={search as never} className={className} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (PAGES.includes(url.pathname)) {
    return (
      <Link to={url.pathname as never} className={className} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={value} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </a>
  );
}

export function categoryHref(slug: string) {
  return `/shop?category=${encodeURIComponent(slug)}`;
}
