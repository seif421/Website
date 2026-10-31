import { Camera, DoorOpen, KeyRound, Lightbulb, Radar, Siren, Video, AlarmClock, Cable } from "lucide-react";
import { Link } from "@tanstack/react-router";

// The slugs match the categories created in the database (see supabase/migrations).
export const CATEGORIES = [
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
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <h2 className="font-display text-xl font-bold tracking-tight">Shop by category</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {CATEGORIES.map(({ label, slug, icon: Icon }) => (
          <Link
            key={slug}
            to="/shop"
            search={{ category: slug }}
            className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-2 py-4 text-center transition-colors hover:border-brand/50 hover:bg-surface"
          >
            <span className="grid size-12 place-items-center rounded-full bg-surface text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
              <Icon className="size-6" />
            </span>
            <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
