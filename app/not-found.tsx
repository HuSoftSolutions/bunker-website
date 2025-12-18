"use client";

import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <PageHero
        title="404"
        subtitle="Lost Your Ball?"
        description="Looks like this page sliced into the rough. Let’s get you back into The Bunker experience."
        imageUrl="https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/frontnine.jpg"
        imageAlt="The Bunker interior"
      />

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center">
        <p className="text-lg text-white/80">
          The page you’re looking for has moved or no longer exists. Explore our
          destinations, menus, or plan your next visit.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
          >
            Back to Home
          </Link>
          <Link
            href="/location"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            View Locations
          </Link>
          <Link
            href="/menus"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Browse Menus
          </Link>
        </div>
      </section>
    </div>
  );
}
