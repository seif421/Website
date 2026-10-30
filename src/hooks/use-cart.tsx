import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// A simple cart that lives in the visitor's browser (works without an account).
// Prices saved here are only for display: the real price is always re-checked on the server at checkout.

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "sentryhaus-cart-v1";
const MAX_PER_ITEM = 10;

const CartContext = createContext<CartContextValue | null>(null);

function clampQty(n: number) {
  return Math.min(MAX_PER_ITEM, Math.max(1, Math.floor(Number.isFinite(n) ? n : 1)));
}

function readStored(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          !!i &&
          typeof i.productId === "string" &&
          typeof i.slug === "string" &&
          typeof i.name === "string" &&
          typeof i.price === "number" &&
          typeof i.quantity === "number",
      )
      .map((i) => ({ ...i, image: typeof i.image === "string" ? i.image : null, quantity: clampQty(i.quantity) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load after the first render so the server and browser HTML match.
  useEffect(() => {
    setItems(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage blocked: the cart still works for this visit */
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, ...item, quantity: clampQty(i.quantity + quantity) } : i,
        );
      }
      return [...prev, { ...item, quantity: clampQty(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: clampQty(quantity) } : i)));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
