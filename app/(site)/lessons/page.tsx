"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiMail, FiPhone } from "react-icons/fi";
import clsx from "clsx";
import { PageHero } from "@/components/layout/PageHero";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { ErrorBox, Field, FormCard, Select, TextInput, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

type FeaturedPro = {
  name: string;
  role: string;
  bio: string;
  phone?: string;
  email?: string;
  image?: string;
};

const FEATURED_PROS: FeaturedPro[] = [
  {
    name: "Sean Madden",
    role: "Director of Golf at The Bunker",
    bio: "Sean is a graduate of the PGM program at Methodist University and has been a member of the PGA of America since 2007. His experience spans multiple leadership roles across the golf industry, including Director of Golf for all Bunker locations. Sean is passionate about teaching and helping players elevate their game at every level.",
    phone: "838-280-0323",
    email: "sean@getinthebunker.golf",
    image: "/sean-headshot.png",
  },
  {
    name: "Phil Kaminski",
    role: "PGA Professional",
    bio: "Phil has dedicated his career to coaching and growing the game. A Methodist University PGA PGM graduate, his certifications include The Gray Institute's NG 360 FPS system, Penn State Biomechanics, and golf's American Development Model. Phil focuses on building confidence through purposeful, data-backed instruction.",
    email: "phil@getinthebunker.golf",
  },
];

const ADDITIONAL_PROS = [
  {
    name: "Brandon Risler",
    description:
      "Brandon has 10+ years of experience in the golf industry, most recently at Saratoga Golf and Polo. He is working toward his PGA membership and serves as a lead fitter with TaylorMade, coaching players of every skill level.",
  },
  {
    name: "Anthony Therrien",
  },
  {
    name: "Kay McMahon",
  },
  {
    name: "Angelo Cafaro",
  },
];

const LESSON_RATES = [
  {
    title: "Individual",
    details: ["One Hour: $125", "Half Hour: $65"],
  },
  {
    title: "9 Hole Playing Lesson",
    details: [
      "$200 inside at any Bunker location or outdoors at Shaker Ridge Country Club or Olde Kinderhook Golf Club",
    ],
  },
];

const COACH_PROGRAMS = [
  {
    title: "Coach Program",
    description:
      "Our coaches will assess your game, define your goals, and build a step-by-step personalized plan for improvement. The program includes:",
    sessions: [
      "Pre-Lesson: Fill out and return the goal and self-assessment sheet to a Bunker coach.",
      "Lesson 1: Assessment of long game, short game, and goals review. 1 hour.",
      "Lesson 2: On-course evaluation, strategies, and mental/physical assessments. 2 ½ hours.",
      "Lesson 3: Private lesson working on the personalized program. 1 hour.",
      "Lesson 4: Continuation of private lessons. 1 hour.",
    ],
    cost: "Cost: $600 per student",
  },
  {
    title: "Coach Group Program",
    description:
      "Coaches will work with students in a group setting to improve their games. Each group receives 12 hours of instruction with 4-6 golfers per group:",
    sessions: [
      "Session 1: On-course assessment of the students' games. 2 ½ hours.",
      "Session 2: Group coaching on training protocols. 1 ½ hours.",
      "Session 3: On-course coaching focused on strategy and mental/physical preparation. 2 ½ hours.",
      "Session 4: Group coaching on training protocols. 1 ½ hours.",
      "Session 5: On-course coaching that brings training to the course. 2 ½ hours.",
      "Session 6: Final group coaching session on training protocols. 1 ½ hours.",
    ],
    cost: "Cost: $600 per student",
  },
];

const TECHNOLOGY_LINKS = [
  { label: "Trackman", href: "https://www.trackman.com/" },
  { label: "Sportbox AI", href: "https://sportbox.ai/" },
  { label: "Hackmotion", href: "https://hackmotion.com/" },
];

const LOCATIONS = [
  "Clifton Park",
  "Guilderland",
  "New Hartford",
  "North Greenbush",
  "Saratoga",
];

const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening"];

export default function LessonsPage() {
  const firebase = useFirebase();
  const { settings } = useInquirySettings(firebase);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const recipients = useMemo(
    () => settings.lessonsDefaultRecipients,
    [settings.lessonsDefaultRecipients],
  );

  const formIsInvalid = !name.trim() || !email.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formIsInvalid) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const docRef = await addDoc(firebase.lessonsInquiriesRef(), {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim(),
        location: location.trim() || null,
        timeOfDay: timeOfDay.trim() || null,
        notes: notes.trim() || null,
        emailTo: recipients,
        createdAt: serverTimestamp(),
      });

      const response = await fetch("/api/inquiries/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: docRef.id,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
          location: location.trim() || null,
          timeOfDay: timeOfDay.trim() || null,
          notes: notes.trim() || null,
          emailTo: recipients,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to send inquiry.");
      }

      setSubmitted(true);
      setName("");
      setPhone("");
      setEmail("");
      setLocation("");
      setTimeOfDay("");
      setNotes("");
      setErrorMessage("");
    } catch (error) {
      console.error("[LessonsPage] inquiry submit failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHero
        title="Lessons at The Bunker"
        subtitle="With Our PGA Professionals"
        description="Our coaching staff blends decades of experience, TrackMan technology, and hospitality-led service to help every golfer grow with confidence."
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black py-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 w-[90%] max-w-5xl rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 text-white/80">
          <div className="space-y-4 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">
              Premium Coaching Experiences
            </p>
            <h2 className="text-3xl font-black uppercase tracking-[0.25em] text-white">
              Lessons at the Bunker
            </h2>
            <p className="max-w-4xl text-sm md:text-base">
              TrackMan-powered instruction, custom practice plans, and pros who know how to make learning fun. Explore our coaching roster and book time with the team that fits your game best.
            </p>
          </div>

          <div className="space-y-8">
            {FEATURED_PROS.map((pro) => (
              <article
                key={pro.name}
                className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white text-zinc-900 shadow-2xl transition hover:-translate-y-1 hover:shadow-primary/40"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/10 opacity-90" />
                <div className="relative grid gap-6 px-6 py-8 md:grid-cols-[120px,1fr] md:px-10 md:py-10">
                  <div className="flex items-center md:items-start">
                    {pro.image ? (
                      <Image
                        src={pro.image}
                        alt={`${pro.name} headshot`}
                        width={112}
                        height={112}
                        sizes="(min-width: 768px) 112px, 96px"
                        className="h-24 w-24 rounded-full border-[6px] border-primary/80 bg-zinc-200 object-cover md:h-28 md:w-28"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-primary/80 bg-zinc-200 text-2xl font-bold uppercase text-zinc-800 md:h-28 md:w-28">
                        {initials(pro.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-4 text-sm md:text-base">
                    <div>
                      <p className="text-2xl font-bold uppercase tracking-wide text-black">
                        {pro.name}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                        {pro.role}
                      </p>
                    </div>
                    <p className="leading-relaxed text-zinc-700">{pro.bio}</p>
                    <div className="flex flex-wrap gap-3 pt-1 text-xs font-semibold uppercase tracking-wide">
                      {pro.phone ? (
                        <ContactLink
                          icon={<FiPhone className="text-base" />}
                          href={`tel:${pro.phone.replace(/[^0-9]/g, "")}`}
                          label={pro.phone}
                        />
                      ) : null}
                      {pro.email ? (
                        <ContactLink
                          icon={<FiMail className="text-base" />}
                          href={`mailto:${pro.email}`}
                          label={pro.email}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-6 rounded-[32px] border border-white/10 bg-zinc-900/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] md:p-10">
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white">
                Meet the Pros
              </h3>
              <p className="text-sm md:text-base">
                From club fitting expertise to junior development specialists, The Bunker has coaches ready for every swing. Reach out to learn more about programming at your home location.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {ADDITIONAL_PROS.map((pro) => (
                <div
                  key={pro.name}
                  className="group flex flex-col gap-3 rounded-3xl border border-white/5 bg-white/5 p-5 transition hover:border-primary/60 hover:bg-primary/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-[4px] border-primary/60 bg-black/70 text-base font-semibold uppercase text-white">
                      {initials(pro.name)}
                    </div>
                    <p className="text-base font-semibold uppercase tracking-wide text-white">
                      {pro.name}
                    </p>
                  </div>
                  {pro.description ? (
                    <p className="text-sm text-white/70">{pro.description}</p>
                  ) : (
                    <p className="text-sm text-white/50">
                      Contact your location to check availability for {pro.name}.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-[32px] border border-primary/40 bg-primary/10 p-6 text-white md:flex-row md:items-center md:justify-between md:p-10">
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-2xl font-semibold uppercase tracking-[0.3em]">
                Book Your Lesson
              </h3>
              <p className="text-sm md:text-base text-white/80">
                Reserve online to lock in time with our PGA professionals or connect with the team for custom packages.
              </p>
            </div>
            <Link
              href="#lessons-contact-form"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-primary-dark"
            >
              Reach{" "}
              <span className="ml-2 block">Out</span>
            </Link>
          </div>

          <div className="space-y-10 rounded-[32px] border border-white/10 bg-zinc-900/70 p-6 text-white md:p-10">
            <div className="space-y-3 text-center">
              <h3 className="text-3xl font-black uppercase tracking-[0.3em]">Rates</h3>
              <p className="text-sm text-white/70">
                Transparent pricing for private instruction, on-course coaching, and multi-session programs.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {LESSON_RATES.map((rate) => (
                <div
                  key={rate.title}
                  className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/80 p-6 text-center shadow-lg"
                >
                  <p className="text-xl font-semibold uppercase tracking-wide text-white">
                    {rate.title}
                  </p>
                  <div className="space-y-1 text-sm text-white/70">
                    {rate.details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {COACH_PROGRAMS.map((program) => (
                <div
                  key={program.title}
                  className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/85 p-6 shadow-lg"
                >
                  <div>
                    <p className="text-xl font-semibold uppercase tracking-wide text-white">
                      {program.title}
                    </p>
                    <p className="mt-2 text-sm text-white/70">{program.description}</p>
                  </div>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-white/60">
                    {program.sessions.map((session) => (
                      <li key={session}>{session}</li>
                    ))}
                  </ul>
                  <p className="pt-2 text-sm font-semibold uppercase tracking-wide text-primary">
                    {program.cost}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {submitted ? (
              <div className="rounded-3xl border border-primary/30 bg-primary/10 px-6 py-8 text-primary">
                <p className="text-xl font-semibold uppercase tracking-wide text-primary">
                  Your inquiry has been sent to The Bunker!
                </p>
              </div>
            ) : (
              <form
                id="lessons-contact-form"
                onSubmit={handleSubmit}
                className="w-full"
              >
                <FormCard>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                      Lessons
                    </p>
                    <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
                      Interested in Lessons?
                    </h2>
                    <p className="text-sm text-white/70">
                      Fill out the form and a member of our coaching staff will reach out with availability and next steps.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Name" required>
                      <TextInput
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </Field>

                    <Field label="Phone">
                      <TextInput
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </Field>

                    <Field label="Email" required>
                      <TextInput
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </Field>

                    <Field label="Location">
                      <Select
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                      >
                        <option value="">Select a Location</option>
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Time of Day">
                      <Select
                        value={timeOfDay}
                        onChange={(event) => setTimeOfDay(event.target.value)}
                      >
                        <option value="">Select a Time of Day</option>
                        {TIMES_OF_DAY.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Additional Notes" className="md:col-span-2">
                      <Textarea
                        rows={4}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                      />
                    </Field>
                  </div>

                  {errorMessage ? <ErrorBox className="mt-4">{errorMessage}</ErrorBox> : null}

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/50">
                      Sent to: <span className="text-white/70">{recipients.join(", ")}</span>
                    </p>
                    <Button
                      type="submit"
                      className={clsx(
                        "w-full sm:w-auto",
                        submitting && "opacity-60 pointer-events-none",
                      )}
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </Button>
                  </div>
                </FormCard>
              </form>
            )}
          </div>

          <div className="space-y-6 rounded-[32px] border border-white/10 bg-black/80 p-6 text-center text-white md:p-10">
            <h3 className="text-2xl font-semibold uppercase tracking-[0.3em] text-primary">
              Technology We Use
            </h3>
            <p className="mx-auto max-w-3xl text-sm text-white/70">
              Explore the cutting-edge tools that power our instruction and help you understand every swing.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold uppercase tracking-wide text-primary">
              {TECHNOLOGY_LINKS.map((tool) => (
                <Link
                  key={tool.label}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

type ContactLinkProps = {
  icon: ReactNode;
  href: string;
  label: string;
};

function ContactLink({ icon, href, label }: ContactLinkProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/20"
    >
      <span className="text-base">{icon}</span>
      {label}
    </a>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
