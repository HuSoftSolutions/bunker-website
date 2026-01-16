"use client";

import { PageHero } from "@/components/layout/PageHero";
import { MembershipInquiryForm } from "@/components/membership/MembershipInquiryForm";
import {
  DEFAULT_MEMBERSHIP_CONTENT,
  DEFAULT_MEMBERSHIP_FAQS,
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

export default function MembershipPageContent() {
  const firebase = useFirebase();
  const { settings } = useBusinessSettings(firebase);

  const { heroImageUrl, membershipContent } = useMemo(() => {
    const configuredHeroUrl =
      typeof settings.membershipHeroImage?.url === "string"
        ? settings.membershipHeroImage.url.trim()
        : "";

    const configured = settings.membershipForm ?? null;
    const merged = {
      ...DEFAULT_MEMBERSHIP_CONTENT,
      ...(configured ?? {}),
      paymentOptions: mergeList(configured?.paymentOptions, [...DEFAULT_MEMBERSHIP_CONTENT.paymentOptions]),
      perks: mergeList(configured?.perks, [...DEFAULT_MEMBERSHIP_CONTENT.perks]),
      details: mergeList(configured?.details, [...DEFAULT_MEMBERSHIP_CONTENT.details]),
      membershipTypes: mergeList(configured?.membershipTypes, [...DEFAULT_MEMBERSHIP_CONTENT.membershipTypes]),
      enrollmentSteps: mergeList(configured?.enrollmentSteps, [...DEFAULT_MEMBERSHIP_CONTENT.enrollmentSteps]),
    };

    return {
      heroImageUrl: configuredHeroUrl || undefined,
      membershipContent: merged,
    };
  }, [
    settings.membershipHeroImage?.url,
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
          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              Payment Options
            </h3>
            <div className="mt-6 space-y-4 text-base text-white/80">
              {membershipContent.paymentOptions.map((option) => (
                <p key={option}>{option}</p>
              ))}
            </div>
            <div className="mt-8">
              <Button href="#membership-form">
                Join Now
              </Button>
            </div>
          </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              {membershipContent.perksTitle}
            </h3>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
              {membershipContent.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              {membershipContent.detailsTitle}
            </h3>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
              {membershipContent.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
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

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              {membershipContent.enrollmentTitle}
            </h3>
            <div className="mt-6 space-y-3 text-base text-white/80">
              {membershipContent.enrollmentSteps.map((step) => (
                <p key={step}>{step}</p>
              ))}
            </div>
            <div className="mt-8" id="membership-form">
              <MembershipInquiryForm
                firebase={firebase}
                content={membershipContent}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
