"use client";

import { useMemo } from "react";
import { PageHero } from "@/components/layout/PageHero";
import useLocations from "@/hooks/useLocations";
import { useFirebase } from "@/providers/FirebaseProvider";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { CareerApplicationForm } from "@/components/careers/CareerApplicationForm";

export default function CareersPage() {
  const firebase = useFirebase();
  const { locations } = useLocations(firebase);

  const hiringLocations = useMemo(() => {
    return locations.filter((location) => location?.careerEmails?.length);
  }, [locations]);

  return (
    <div className="flex flex-col">
      <PageHero
        title="Careers"
        subtitle="Join The Team"
        description="Bring your talent to The Bunker—where hospitality, golf, and entertainment come together. Explore open roles and connect with the location closest to you."
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <CareerApplicationForm firebase={firebase} className="mb-12" />

        <div className="space-y-8 text-white/80">
          <p>
            We&apos;re always seeking energetic hospitality pros, golf
            enthusiasts, and operations leaders who share our commitment to
            outstanding guest experiences. If you don&apos;t see an opening that
            fits today, reach out and introduce yourself—we&apos;re growing fast.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Location Contacts
          </h2>

          {hiringLocations.length ? (
            <div className="space-y-4">
              {hiringLocations.map((location) => {
                const emails = Array.isArray(location.careerEmails)
                  ? location.careerEmails
                  : typeof location.careerEmails === "string"
                  ? [location.careerEmails]
                  : [];

                return (
                  <article
                    key={location.id ?? location.name}
                    className="rounded-3xl border border-white/10 bg-black/40 px-6 py-6 shadow-lg shadow-black/30"
                  >
                    <h3 className="text-xl font-semibold uppercase tracking-wide text-primary">
                      {location.name}
                    </h3>
                    {location.address ? (
                      <p className="text-sm text-white/60">
                        {location.address}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {emails.map((email) => (
                        <ExternalLinkButton
                          key={email}
                          title={email}
                          url={`mailto:${email}`}
                          className="bg-transparent text-xs text-white hover:bg-white/10"
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center text-white/60">
              We&apos;re not actively hiring right now, but feel free to send
              your resume and we&apos;ll reach out when positions open up.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
