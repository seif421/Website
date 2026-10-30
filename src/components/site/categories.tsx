import { Camera, DoorOpen, KeyRound, Lightbulb, Radar, Siren, Video, AlarmClock, Cable } from "lucide-react";
import { Link } from "@tanstack/react-router";

// The slugs match the categories created in the database (see supabase/migrations).
const CATEGORIES = [
  { label: "Smart Cameras", slug: "smart-cameras", icon: Camera },
  { label: "Doorbell Cameras", slug: "doorbell-cameras", icon: DoorOpen },
  { label: "Motion Sensors", slug: "motion-sensors", icon: Radar },
  { label: "Window Sensors", slug: "window-sensors", icon: AlarmClock },
  { label: "Smart Locks", slug: "smart-locks", icon: KeyRound },
  { label: "Alarm Systems", slug: "alarm-systems", icon: Siren },
  { label: "Video Recorders", slug: "video-recorders", icon: Video },
  { label: "Security Lights", slug: "security-lights", icon: Lightbulb },
  { label: "Accessories", slug: "accessories", icon: Cable },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-brand">Shop by category</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to protect home.
          </h2>
        </div>
        <Link to="/shop" className="hidden text-sm font-medium text-foreground hover:text-brand sm:inline-flex">
          View all →
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map(({ label, slug, icon: Icon }) => (
          <Link
            key={slug}
            to="/shop"
            search={{ category: slug }}
            className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elevated"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-surface text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
