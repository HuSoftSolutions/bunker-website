"use client";

import { PageHero } from "@/components/layout/PageHero";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { useJuniorGolfConfig } from "@/hooks/useJuniorGolfConfig";
import { useFirebase } from "@/providers/FirebaseProvider";

export default function JuniorGolfPage() {
  const firebase = useFirebase();
  const { config } = useJuniorGolfConfig(firebase);

  return (
    <div className="flex flex-col">
      <PageHero
        title={config.heroTitle || "Junior Golf"}
        subtitle={config.heroSubtitle ?? undefined}
        description={config.heroDescription ?? undefined}
        imageUrl={config.heroImageUrl ?? undefined}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-16 text-white/80">
        {config.programs.length ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
              Upcoming Junior Programs
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {config.programs.map((program) => (
                <div
                  key={program.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                    {program.title}
                  </h3>
                  {program.description ? (
                    <p className="mt-3 text-sm text-white/70">
                      {program.description}
                    </p>
                  ) : null}
                  {program.ctaUrl ? (
                    <div className="mt-5">
                      <ExternalLinkButton
                        title={program.ctaLabel || "Learn More"}
                        url={program.ctaUrl}
                        className="w-full"
                        large
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {config.lessonRates.length ? (
          <div className={config.programs.length ? "mt-14" : ""}>
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
              Junior Lesson Rates
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {config.lessonRates.map((rate) => (
                <div
                  key={rate.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                    {rate.title}
                  </h3>
                  <div className="mt-3 space-y-1 text-sm text-white/70">
                    {rate.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!config.programs.length && !config.lessonRates.length ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center text-white/60">
            Junior golf content is being updated. Check back soon.
          </div>
        ) : null}
      </section>
    </div>
  );
}

