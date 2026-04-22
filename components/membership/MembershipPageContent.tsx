"use client";

import { PageHero } from "@/components/layout/PageHero";
import { MembershipInquiryForm } from "@/components/membership/MembershipInquiryForm";
import {
  DEFAULT_SEASON_LABELS,
  DEFAULT_MEMBERSHIP_FAQS,
  MEMBERSHIP_SEASONS,
  createDefaultSeasonalMembershipContent,
  type MembershipFormContent,
} from "@/data/membershipContent";
import { Button } from "@/components/ui/Button";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useMemo } from "react";

const SectionDivider = () => <hr className="my-12 border-white/10" />;

function mergeList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .filter(Boolean);
}

function mergeMembershipContent(
  configured: unknown,
  fallback: MembershipFormContent,
): MembershipFormContent {
  const candidate =
    configured && typeof configured === "object"
      ? (configured as Partial<MembershipFormContent>)
      : {};

  return {
    ...fallback,
    ...candidate,
    paymentOptions: mergeList(candidate.paymentOptions, [...fallback.paymentOptions]),
    perks: mergeList(candidate.perks, [...fallback.perks]),
    details: mergeList(candidate.details, [...fallback.details]),
    membershipTypes: mergeList(candidate.membershipTypes, [...fallback.membershipTypes]),
    enrollmentSteps: mergeList(candidate.enrollmentSteps, [...fallback.enrollmentSteps]),
  };
}

export default function MembershipPageContent() {
  const firebase = useFirebase();
  const { settings } = useBusinessSettings(firebase);

  const { heroImageUrl, seasonalMemberships } = useMemo(() => {
    const configuredHeroUrl =
      typeof settings.membershipHeroImage?.url === "string"
        ? settings.membershipHeroImage.url.trim()
        : "";

    const seasonDefaults = createDefaultSeasonalMembershipContent();
    const configuredSeasons =
      settings.membershipSeasons && typeof settings.membershipSeasons === "object"
        ? settings.membershipSeasons
        : null;
    const legacyConfigured = settings.membershipForm ?? null;
    const hasSeasonConfig = Boolean(configuredSeasons);

    const seasonal = MEMBERSHIP_SEASONS.map((season) => {
      const seasonConfig = configuredSeasons?.[season];
      const seasonFallback = seasonDefaults[season];
      const formConfig = seasonConfig?.form ?? (!hasSeasonConfig ? legacyConfigured : null);
      const content = mergeMembershipContent(formConfig, seasonFallback);
      const label =
        typeof seasonConfig?.label === "string" && seasonConfig.label.trim()
          ? seasonConfig.label.trim()
          : DEFAULT_SEASON_LABELS[season];

      return { season, label, content };
    });

    return {
      heroImageUrl: configuredHeroUrl || undefined,
      seasonalMemberships: seasonal,
    };
  }, [
    settings.membershipHeroImage?.url,
    settings.membershipSeasons,
    settings.membershipForm,
  ]);

  return (
    <div className="flex flex-col">
      <PageHero
        title="Membership"
        subtitle="The Bunker Elite"
        description="Discover the payment options, daily perks, and FAQs for our premier membership tier."
        imageUrl={heroImageUrl}
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black py-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 w-[90%] max-w-5xl rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-5xl px-4 text-white/80 sm:px-8">
          <section className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              {seasonalMemberships.map(({ season, label, content }) => (
                <article
                  key={season}
                  className="rounded-3xl border border-white/10 bg-black/30 p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                    {label}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold uppercase tracking-wide text-white">
                    Payment Options
                  </h3>
                  <div className="mt-6 space-y-4 text-base text-white/80">
                    {content.paymentOptions.map((option) => (
                      <p key={option}>{option}</p>
                    ))}
                  </div>

                  <SectionDivider />

                  <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
                    {content.perksTitle}
                  </h3>
                  <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
                    {content.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>

                  <SectionDivider />

                  <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
                    {content.detailsTitle}
                  </h3>
                  <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
                    {content.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>

                  <SectionDivider />

                  <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
                    {content.enrollmentTitle}
                  </h3>
                  <div className="mt-6 space-y-3 text-base text-white/80">
                    {content.enrollmentSteps.map((step) => (
                      <p key={step}>{step}</p>
                    ))}
                  </div>
                  <div className="mt-8">
                    <Button href="#membership-form">Join Now</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              Join A Membership
            </h3>
            <div className="mt-8" id="membership-form">
              <MembershipInquiryForm
                firebase={firebase}
                content={
                  seasonalMemberships[0]?.content ??
                  createDefaultSeasonalMembershipContent().winter
                }
                seasonOptions={seasonalMemberships.map(({ season, label, content }) => ({
                  season,
                  label,
                  content,
                }))}
              />
            </div>
          </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">FAQs</h3>
            <div className="mt-6 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
              {DEFAULT_MEMBERSHIP_FAQS.map(({ question, answer }) => (
                <details key={question} className="group border-b border-white/10 last:border-none">
                  <summary className="cursor-pointer list-none px-6 py-5 text-left text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    {question}
                  </summary>
                  <div className="px-6 pb-6 text-base text-white/70">{answer}</div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
