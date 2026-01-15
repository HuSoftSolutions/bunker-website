"use client";

import { PageHero } from "@/components/layout/PageHero";
import { useFirebase } from "@/providers/FirebaseProvider";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { CareerApplicationForm } from "@/components/careers/CareerApplicationForm";
import { useInquirySettings } from "@/hooks/useInquirySettings";

export default function CareersPage() {
  const firebase = useFirebase();
  const { settings } = useInquirySettings(firebase);
  const recipients = settings.careersDefaultRecipients;

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
            Careers Contact
          </h2>

          {recipients.length ? (
            <div className="flex flex-wrap gap-3">
              {recipients.map((email) => (
                <ExternalLinkButton
                  key={email}
                  title={email}
                  url={`mailto:${email}`}
                  className="bg-zinc-900 text-xs text-white hover:bg-zinc-800"
                />
              ))}
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center text-white/60">
              No careers contact emails have been configured yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
