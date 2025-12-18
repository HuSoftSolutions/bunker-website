"use client";

import { PageHero } from "@/components/layout/PageHero";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useMemo } from "react";

const DEFAULT_REGISTRATION_LINK = "https://forms.gle/Ce1LLJKi8tKuoxPC9";

const PAYMENT_OPTIONS = [
  {
    title: "$1500 for the season",
    description: "one time payment (11/1/25-4/30/26) Over $6000 VALUE",
  },
  {
    title: "$275 per month",
    description: "two month minimum",
  },
  {
    title: "$350 for one month",
    description: "one time payment ($1000 VALUE)",
  },
];

const PERKS = [
  "Gives you 60 minutes of simulator time in standard bays ONLY per day during non-peak hours. 10% off simulator time used beyond 60 minutes. Non-peak hours are Monday-Thursday from 9am-3pm ($1000 VALUE) excludes Holidays",
  "Members playing together can add their 60 minute time allocations. (e.g. 3 members can occupy one sim for 3 hours without incurring additional charges)",
  "10% off simulator time during peak times including guests (any bay)",
  "10% off food and beverage anytime",
  "10% off lessons/club fittings",
  "Club storage if available",
  "$100 OFF one party per year ($1000 min. spend)",
  "Can be used at any location",
  "Black card issued",
  "20% off apparel",
];

const DETAILS = [
  "You CAN use your hour towards Non-peak golf league fees",
  "Cannot be used toward any peak leagye fees or tournaments and discounts do not apply to these fees as well",
  "Members must be present to utilize benefits",
  "Guests will be charged $15 per person during the first hour, the total cost paid by guest(s) will not exceed the listed hourly rate for the bay that will be used",
  "Membership is nontransferable and can only be used by member card holders. Violation will result in membership cancellation without a refund given",
  "Monthly membership will automatically be renewed for following month unless member gives one week notice to cancel",
];

const FAQS = [
  {
    question: "What are your membership hours?",
    answer:
      "Our facility is open Monday through Thursday from 9 am-3 pm. Excludes Holidays. Please check our website for any special holiday hours.",
  },
  {
    question: "How do I book simulator time?",
    answer:
      "You can book simulator time through our website or by calling any one of our locations. Advance booking is recommended, especially during peak hours.",
  },
  {
    question: "What are peak and non-peak hours?",
    answer:
      "Peak Hours: Weekdays anytime after 3 pm, weekends & any major holidays. Non-Peak Hours: Monday to Friday, 9 am to 3 pm excluding holidays.",
  },
  {
    question: "Can I bring guests?",
    answer:
      "Absolutely! Guests are welcome. Please note there is a fee of $15 per person for the first hour, and any extra hours can be split among members and guests with a 10 percent discount.",
  },
  {
    question: "What is included in the membership?",
    answer:
      "Membership includes 60 minutes of simulator time per day during non-peak hours, discounts on food, beverages, lessons, club fittings, and merchandise, as well as club storage (if available). Discounts will be applied to the entire bill as long as the group does not exceed 8 people.",
  },
  {
    question: "How can I cancel my monthly membership?",
    answer:
      "To cancel your monthly membership, please provide one week's notice before your next billing date. You can do this by contacting the store that purchased your membership.",
  },
  {
    question: "Can I use my membership benefits in private or VIP rooms?",
    answer:
      "You'll receive a 10% discount on any simulator time in the VIP suite or private rooms. However, the one free hour of simulator time during non-peak hours cannot be used in the VIP suite or private rooms.",
  },
  {
    question: "Do you serve food and beverages?",
    answer:
      "Yes! We offer a full menu of food and beverages. Members enjoy a 10% discount on any food and beverage purchases.",
  },
  {
    question: "Is my membership transferable?",
    answer:
      "No, memberships are non-transferable and can only be used by the cardholder. Violations will result in cancellation without a refund.",
  },
  {
    question: "What happens if I exceed my simulator time?",
    answer:
      "If you exceed your 60 minutes of simulator time during non-peak hours, you'll receive a 10% discount on any additional time used.",
  },
  {
    question: "Can I buy a membership as a gift?",
    answer:
      "Yes, our One-Month Gift Membership is a great option! It provides the same benefits as a regular membership but does not automatically renew.",
  },
  {
    question: "What happens if multiple members play together?",
    answer:
      "If multiple members are playing together, they can each use their one free hour of simulator time during non-peak hours collectively. For example, if three members are playing together, they would receive a total of three free hours during non-peak.",
  },
  {
    question: "Do I get any discounts for hosting a party as a member?",
    answer:
      "Yes! As a member, you're eligible for a 10% discount on one party booking per year. This discount can be applied to the total cost of the party, including simulator time, food, and beverages. Please note that this discount can only be used once per year and cannot be combined with any other promotions or discounts.",
  },
];

const SectionDivider = () => <hr className="my-12 border-white/10" />;

const SignUpButton = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
  >
    SIGN UP NOW
  </a>
);

export default function MembershipPageContent() {
  const firebase = useFirebase();
  const { settings } = useBusinessSettings(firebase);

  const { heroImageUrl, registrationLink } = useMemo(() => {
    const registrationHref =
      typeof settings.membershipRegistrationUrl === "string" &&
      settings.membershipRegistrationUrl.trim().length > 0
        ? settings.membershipRegistrationUrl.trim()
        : DEFAULT_REGISTRATION_LINK;

    const configuredHeroUrl =
      typeof settings.membershipHeroImage?.url === "string"
        ? settings.membershipHeroImage.url.trim()
        : "";

    return {
      heroImageUrl: configuredHeroUrl || undefined,
      registrationLink: registrationHref,
    };
  }, [settings.membershipHeroImage?.url, settings.membershipRegistrationUrl]);

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
              {PAYMENT_OPTIONS.map((option) => (
              <p key={option.title}>
                <span className="font-semibold">{option.title}</span> — {option.description}
              </p>
            ))}
          </div>
          <div className="mt-8">
            <SignUpButton href={registrationLink} />
          </div>
        </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
              Plenty of Perks
            </h3>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
              {PERKS.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">Details</h3>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-base text-white/80">
              {DETAILS.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>

          <SectionDivider />

          <section>
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">FAQs</h3>
            <div className="mt-6 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
              {FAQS.map(({ question, answer }) => (
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
            <h3 className="text-2xl font-bold uppercase tracking-wide text-white">Enrollment</h3>
            <div className="mt-6 space-y-3 text-base text-white/80">
              <p>Enrolling in The Bunker Elite Membership is a two step process.</p>
              <p className="font-semibold">Step 1:</p>
              <p>Click the "SIGN UP NOW" button below and complete the Google form.</p>
            <p className="font-semibold">Step 2:</p>
            <p>
              Once the form is submitted, use the link on the submission page to complete the payment.
            </p>
          </div>
            <div className="mt-8">
              <SignUpButton href={registrationLink} />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
