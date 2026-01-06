import { PageHero } from "@/components/layout/PageHero";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";

const CONTACT_EMAIL = "info@getinthebunker.golf";
const PRESS_EMAIL = "emily@getinthebunker.golf";

export default function ContactPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        title="Contact"
        subtitle="Let’s Connect"
        description="Questions about events, memberships, or corporate outings? Drop us a line and the Bunker team will be in touch."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6 text-white/80">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
              General Inquiries
            </h2>
            <p>
              For reservations, private events, and day-of questions, email us
              or call the location nearest you. Our team monitors inboxes daily
              and strives to respond within one business day.
            </p>
            <ExternalLinkButton
              title={CONTACT_EMAIL}
              url={`mailto:${CONTACT_EMAIL}`}
              className="w-full justify-center rounded-full bg-transparent text-white hover:bg-white/10 md:w-auto md:justify-start"
            />
          </div>

          <div className="space-y-6 rounded-3xl border border-white/10 bg-black/30 p-6 text-white/80 shadow-lg shadow-black/30">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
              Media & Partnerships
            </h2>
            <p>
              For sponsorships, press opportunities, or brand collaborations,
              connect with our partnerships team.
            </p>
            <ExternalLinkButton
              title={PRESS_EMAIL}
              url={`mailto:${PRESS_EMAIL}`}
              className="w-full justify-center rounded-full bg-transparent text-white hover:bg-white/10 md:w-auto md:justify-start"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
