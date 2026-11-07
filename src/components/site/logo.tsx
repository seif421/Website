import { ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="Rivvo home">
      <span className="grid size-9 place-items-center rounded-xl gradient-brand shadow-glow transition-transform group-hover:scale-105">
        <ShoppingBag className="size-5 text-brand-foreground" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Riv<span className="text-brand">vo</span>
      </span>
    </Link>
  );
}