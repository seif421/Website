import { Star } from "lucide-react";

const REVIEWS = [
  { name: "Mark T.", location: "Austin, TX", body: "Set up the Cam Pro 4K in literally 6 minutes. The night vision is unreal — I can read license plates from the driveway." },
  { name: "Priya S.", location: "San Jose, CA", body: "I replaced my old doorbell with the SentryHaus. Better app, sharper picture, no subscription. Wish I'd switched sooner." },
  { name: "Daniel R.", location: "Brooklyn, NY", body: "Smart Lock Touch just works. Auto-lock, fingerprint, app — and the build quality feels like it costs twice the price." },
];

export function Reviews() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand">Loved across America</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            12,000+ five-star reviews.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 shadow-soft">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-warning text-warning" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-foreground">"{r.body}"</blockquote>
              <figcaption className="mt-auto text-sm">
                <div className="font-semibold text-foreground">{r.name}</div>
                <div className="text-muted-foreground">{r.location}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}