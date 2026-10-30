import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Plus, Share2, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/layout";
import { ProductCard } from "@/components/site/product-card";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/store/format";
import { fetchProductPage } from "@/lib/store/queries";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const data = await fetchProductPage(params.slug);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Product — SentryHaus" }] };

    const title = p.metaTitle || `${p.name} — SentryHaus`;
    const description = p.metaDescription || p.shortDescription || `Buy ${p.name} at SentryHaus.`;
    const image = p.images[0];

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description,
      sku: p.sku ?? undefined,
      image: p.images.length ? p.images : undefined,
      brand: p.brandName ? { "@type": "Brand", name: p.brandName } : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: p.price.toFixed(2),
        availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
      ...(p.reviewCount > 0
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } }
        : {}),
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          // "<" is escaped so product text can never close the script tag.
          children: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
  component: ProductPage,
});

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < Math.round(value) ? "fill-warning text-warning" : "text-border"}`} aria-hidden />
      ))}
    </span>
  );
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const current = images[active];

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-border bg-surface text-muted-foreground">
        <ShieldCheck className="size-16 opacity-30" aria-hidden />
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-surface"
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
      >
        <img
          src={current}
          alt={name}
          width={900}
          height={900}
          className="size-full object-cover transition-transform duration-200"
          style={{ transform: zoom ? "scale(2)" : "scale(1)", transformOrigin: `${pos.x}% ${pos.y}%` }}
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Product photos">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`size-16 overflow-hidden rounded-xl border-2 bg-surface ${
                  i === active ? "border-brand" : "border-transparent hover:border-border"
                }`}
              >
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductPage() {
  const { product: p, related, reviews } = Route.useLoaderData();
  const cart = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const lowStock = p.inStock && p.availableUnits != null && p.availableUnits > 0 && p.availableUnits <= p.lowStockThreshold;

  function addToCart() {
    cart.add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0] ?? null }, qty);
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <SiteLayout>
      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {p.categoryName && p.categorySlug && (
            <>
              <span className="mx-2">/</span>
              <Link to="/shop" search={{ category: p.categorySlug }} className="hover:text-foreground">
                {p.categoryName}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Gallery key={p.id} images={p.images} name={p.name} />

          <div>
            {p.brandName && <p className="text-sm font-medium text-brand">{p.brandName}</p>}
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{p.name}</h1>

            {p.reviewCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Stars value={p.rating} />
                <span className="font-medium text-foreground">{p.rating.toFixed(1)}</span>
                <a href="#reviews" className="hover:underline">
                  ({p.reviewCount.toLocaleString()} review{p.reviewCount === 1 ? "" : "s"})
                </a>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="font-display text-3xl font-bold">{formatMoney(p.price)}</span>
              {p.compareAt && <span className="text-lg text-muted-foreground line-through">{formatMoney(p.compareAt)}</span>}
              {p.discountPct > 0 && (
                <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
                  Save {p.discountPct}%
                </span>
              )}
            </div>

            <p className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${p.inStock ? "text-emerald-600" : "text-destructive"}`}>
              {p.inStock && <Check className="size-4" aria-hidden />}
              {!p.inStock ? "Out of stock" : lowStock ? `Only ${p.availableUnits} left` : "In stock"}
            </p>

            {p.shortDescription && <p className="mt-5 leading-relaxed text-muted-foreground">{p.shortDescription}</p>}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex h-12 items-center rounded-full border border-input" role="group" aria-label="Quantity">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="grid size-12 place-items-center rounded-full hover:bg-surface"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                  className="grid size-12 place-items-center rounded-full hover:bg-surface"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                disabled={!p.inStock}
                onClick={() => {
                  addToCart();
                  toast.success("Added to cart");
                }}
                className="h-12 flex-1 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add to cart
              </button>
              <button
                type="button"
                disabled={!p.inStock}
                onClick={() => {
                  addToCart();
                  navigate({ to: "/cart" });
                }}
                className="h-12 rounded-full border border-input px-6 text-sm font-semibold transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy now
              </button>
              <button
                type="button"
                onClick={share}
                aria-label="Share this product"
                className="grid size-12 place-items-center rounded-full border border-input hover:bg-surface"
              >
                <Share2 className="size-4" aria-hidden />
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {p.sku && (
                <>
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-medium">{p.sku}</dd>
                </>
              )}
              {p.warranty && (
                <>
                  <dt className="text-muted-foreground">Warranty</dt>
                  <dd className="font-medium">{p.warranty}</dd>
                </>
              )}
            </dl>

            <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
              Delivery times and shipping costs are shown at checkout. Read our{" "}
              <Link to="/shipping" className="font-medium text-foreground underline">Shipping Policy</Link> and{" "}
              <Link to="/refunds" className="font-medium text-foreground underline">Refund Policy</Link>.
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          {(p.description || p.features.length > 0) && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-xl font-bold">About this product</h2>
              {p.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{p.description}</p>}
              {p.features.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {p.specs.length > 0 && (
            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="font-display text-xl font-bold">Specifications</h2>
              <dl className="mt-3 divide-y divide-border rounded-2xl border border-border">
                {p.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <section id="reviews" aria-labelledby="reviews-heading" className="mt-14">
          <h2 id="reviews-heading" className="font-display text-xl font-bold">Customer reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                  <Stars value={r.rating} />
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-US")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-14">
            <h2 id="related-heading" className="font-display text-xl font-bold">You may also like</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </section>
        )}
      </article>
    </SiteLayout>
  );
}
