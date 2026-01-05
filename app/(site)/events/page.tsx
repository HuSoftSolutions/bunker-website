"use client";

import { PageHero } from "@/components/layout/PageHero";
import { EventsInquiryForm } from "@/components/events/EventsInquiryForm";
import { useFirebase } from "@/providers/FirebaseProvider";

const EVENT_HIGHLIGHTS = [
  "Private bay rentals with full-service food and beverage.",
  "Team building, corporate outings, and milestone celebrations.",
  "Custom menus, drink packages, and event coordination support.",
];

export default function EventsPage() {
  const firebase = useFirebase();

  return (
    <div className="flex flex-col">
      <PageHero
        title="Events"
        subtitle="Book a Private Experience"
        description="Host your next celebration or corporate outing at The Bunker. Share the details and our events team will curate the perfect setup."
        imageUrl="https://storage.googleapis.com/thebunker-assets/thebunker/bunker-leagues-header.jpg"
        imageAlt="The Bunker events"
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-16 text-white/80">
        <div className="space-y-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
                Event Experiences
              </h2>
              <p className="mt-3 text-sm text-white/70">
                From birthday parties to company mixers, The Bunker offers immersive TrackMan
                bays, elevated hospitality, and a team that helps every detail feel effortless.
              </p>
              <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-white/80">
                {EVENT_HIGHLIGHTS.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-8 text-sm text-white/80">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                What to Expect
              </p>
              <p className="mt-4">
                We&apos;ll confirm your preferred location, timing, and group size, then share
                availability and package options tailored to your event.
              </p>
            </div>
          </div>

          <EventsInquiryForm firebase={firebase} />
        </div>
      </section>
    </div>
  );
}
