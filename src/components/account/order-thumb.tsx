import { Package } from "lucide-react";
import { imageUrl, toImages } from "@/lib/store/format";

export type OrderLine = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  product: { slug: string; images: unknown } | null;
};

/** First picture of the product that was bought (the product may have been removed since). */
export function lineImage(l: OrderLine): string | null {
  return toImages(l.product?.images)[0] ?? imageUrl(null);
}

export function OrderThumb({ line, size = "size-14" }: { line: OrderLine; size?: string }) {
  const src = lineImage(line);
  return src ? (
    <img src={src} alt={line.product_name} loading="lazy" className={`${size} shrink-0 rounded-lg border object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-lg border bg-surface text-muted-foreground`}>
      <Package className="size-5" aria-hidden />
    </span>
  );
}
