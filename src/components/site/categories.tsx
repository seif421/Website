import { Camera, DoorOpen, KeyRound, Lightbulb, Radar, Siren, Video, Lock, AlarmClock, Cable } from "lucide-react";
import { Link } from "@tanstack/react-router";

const CATEGORIES = [
  { label: "Smart Cameras", icon: Camera },
  { label: "Doorbell Cameras", icon: DoorOpen },
  { label: "Motion Sensors", icon: Radar },
  { label: "Window Sensors", icon: AlarmClock },
  { label: "Smart Locks", icon: KeyRound },
  { label: "Alarm Systems", icon: Siren },
  { label: "Video Recorders", icon: Video },
  { label: "Security Lights", icon: Lightbulb },
  { label: "Smart Door Locks", icon: Lock },
  { label: "Accessories", icon: Cable },
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
        {CATEGORIES.map(({ label, icon: Icon }) => (
          <Link
            key={label}
            to="/shop"
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