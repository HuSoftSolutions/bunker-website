"use client";

import { PageHero } from "@/components/layout/PageHero";
import { LeagueInquiryForm } from "@/components/leagues/LeagueInquiryForm";
import { useFirebase } from "@/providers/FirebaseProvider";

const LEAGUE_FORMATS = [
  {
    title: "Team Scramble",
    description:
      "Grab three friends and compete in a laid-back, best-ball format. Weekly prizes and rotating course lineups keep every round fresh.",
  },
  {
    title: "Match Play",
    description:
      "Head-to-head action with handicaps applied so every match is tight. Perfect for players who enjoy strategy and clutch putts.",
  },
  {
    title: "Strokes & Stats",
    description:
      "TrackMan data fuels this individual stroke play league. Gain insights on dispersion, gapping, and scoring trends throughout the season.",
  },
];

const LEAGUE_PERKS = [
  "Eight-week seasons with flexible scheduling windows.",
  "Dedicated league concierge to help swap times when life happens.",
  "Weekly drink and menu features crafted for league nights.",
  "Live leaderboards and scoring powered by TrackMan.",
];

export default function LeaguesPage() {
  const firebase = useFirebase();

  return (
    <div className="flex flex-col">
      <PageHero
        title="Leagues"
        subtitle="Play With Your Crew"
        description="Make weeknights more competitive. The Bunker leagues blend premium simulators, curated hospitality, and bragging-rights matchups all season long."
        imageUrl="https://storage.googleapis.com/thebunker-assets/thebunker/bunker-leagues-header.jpg"
        imageAlt="The Bunker leagues"
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-16 text-white/80">
        <div className="space-y-12">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
              Why Join a Bunker League
            </h2>
            <p>
              Our leagues are built for golfers who love the game and the social scene that comes with it. Meet new playing partners, explore world-class courses on TrackMan, and enjoy handcrafted food and beverage specials every week.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {LEAGUE_FORMATS.map((format) => (
              <div
                key={format.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                  {format.title}
                </h3>
                <p className="mt-3 text-sm text-white/70">
                  {format.description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-[1.4fr,1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                League Perks
              </h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/80">
                {LEAGUE_PERKS.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-primary/30 bg-primary/10 p-8 text-sm text-white/80">
              <div>
                <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                  Seasonal Schedule
                </h3>
                <p className="mt-2">
                  Winter, spring, summer, and fall seasons are available at most locations. Choose a weekly timeslot or opt for open-play windows to submit your scores.
                </p>
              </div>
              <p>
                Want in? Reach out to your preferred Bunker location to reserve a bay or join the waitlist for the next season.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-center text-base font-semibold uppercase tracking-wide text-white">
              Bunker leagues include a course schedule for the season, TRACKMAN handicaps, make-up days, season long prizes and drink specials.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-lg shadow-black/30">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                Pre-Season
              </p>
              <div className="mt-6 grid gap-6 text-center text-sm text-white/80 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Dates
                  </p>
                  <p className="mt-1 text-white">10/7–11/28</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Tee Times
                  </p>
                  <p className="mt-1 text-white">Mon/Tues/Wed Nights</p>
                  <p className="text-white/70">5–7:15 pm, 7:15–9:30 pm</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Greens Fees
                  </p>
                  <p className="mt-1 text-white">$240 for 8 weeks of play</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-lg shadow-black/30">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                In-Season
              </p>
              <div className="mt-6 grid gap-6 text-center text-sm text-white/80 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Dates
                  </p>
                  <p className="mt-1 text-white">1/6–3/27</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Tee Times
                  </p>
                  <p className="mt-1 text-white">Mon/Tues/Wed Nights</p>
                  <p className="text-white/70">5–7:15 pm, 7:15–9:30 pm</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Greens Fees
                  </p>
                  <p className="mt-1 text-white">$360 for 12 weeks of play</p>
                </div>
              </div>
            </div>
          </div>

          <LeagueInquiryForm firebase={firebase} />
        </div>
      </section>
    </div>
  );
}
