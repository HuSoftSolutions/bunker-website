import type { ReactNode } from "react";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";

type FAQItem = {
  question: string;
  answer: ReactNode;
};

const FAQS: FAQItem[] = [
  {
    question: "How do you book a tee time?",
    answer: (
      <>
        You can book online by choosing a location{" "}
        <Link
          href="/location"
          className="font-semibold uppercase text-primary transition hover:text-primary/80"
        >
          here
        </Link>
        !
      </>
    ),
  },
  {
    question: "Is the rate per bay or per person?",
    answer: (
      <>
        The hourly rate is per bay! You can have up to 8 people in a bay at one
        time and can split the cost between the number of golfers playing.
        <br />
        <strong>For example</strong>: If 4 people are playing in one bay for
        one hour, the cost would be $15 per person per hour.
      </>
    ),
  },
  {
    question: "How long does it take?",
    answer:
      "We recommend 30 minutes per person for 9 holes, one hour per person for 18. So if you have a foursome you could play 9 holes in two hours.",
  },
  {
    question: "What do I need to wear?",
    answer:
      "We are friendly to all types of attire! Golf attire and athletic wear are both welcomed including jeans.",
  },
  {
    question: "Can I wear golf shoes?",
    answer: "Golf shoes are acceptable but not necessary.",
  },
  {
    question: "Will I need to bring clubs?",
    answer:
      "You are welcome to bring your own clubs, or we have plenty of clubs at our facility for you to use!",
  },
  {
    question: "Do I need to golf to come in?",
    answer:
      "No! Our bar is open to the public and welcomes guests whether you're golfing or not.",
  },
  {
    question: "Where do I enter at the Guilderland location?",
    answer:
      "The entrance to The Bunker is in the back of the building. Park in the lot behind the building and enter from that side.",
  },
];

export default function FaqsPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        title="FAQs"
        subtitle="Plan Your Visit"
        description="Here are answers to common questions about visiting The Bunker. Still curious? Reach out and we’ll be happy to help."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="space-y-6">
          {FAQS.map((item) => (
            <article
              key={item.question}
              className="rounded-3xl border border-white/10 bg-black/30 px-6 py-6 shadow-lg shadow-black/30"
            >
              <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
                {item.question}
              </h2>
              <p className="mt-3 text-sm text-white/70">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
