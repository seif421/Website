import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// A signed-in customer's saved products. Guests are sent to sign in when they tap the heart.

type Ctx = {
  ids: Set<string>;
  count: number;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let live = true;
    supabase
      .from("wishlist")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (live) setIds(new Set((data ?? []).map((r) => r.product_id as string)));
      });
    return () => {
      live = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) {
        toast("Sign in to save products to your wishlist.");
        navigate({ to: "/auth", search: { redirect: "/wishlist" } as never });
        return;
      }
      const had = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (had) next.delete(productId);
        else next.add(productId);
        return next;
      });
      const { error } = had
        ? await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId)
        : await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
      if (error) {
        setIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error("Could not update your wishlist. Please try again.");
      } else {
        toast.success(had ? "Removed from wishlist" : "Saved to wishlist");
      }
    },
    [user, ids, navigate],
  );

  const value = useMemo<Ctx>(
    () => ({ ids, count: ids.size, has: (id) => ids.has(id), toggle }),
    [ids, toggle],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): Ctx {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
