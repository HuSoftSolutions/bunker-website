"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import { Button } from "@/components/ui/Button";
import { ErrorBox, Field, FormCard, Select, TextInput, Textarea } from "@/components/ui/Form";

type LeagueInquiryFormProps = {
  firebase: Firebase;
  className?: string;
};

const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;
const TEXT_REGEX = /^[a-zA-Z]+$/;
const PHONE_REGEX =
  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

const LOCATION_OPTIONS = [
  "Mohawk Harbor",
  "Clifton Park",
  "Guilderland",
  "New Hartford",
  "North Greenbush",
  "Saratoga",
  "Latham",
] as const;

const SEASON_OPTIONS = ["Pre-Season", "In-Season"] as const;

function convertTo12HourFormat(time: string) {
  const [hoursRaw, minutes] = time.split(":");
  if (!hoursRaw || !minutes) return time;
  let hours = Number(hoursRaw);
  if (Number.isNaN(hours)) return time;
  const period = hours < 12 ? "AM" : "PM";
  if (hours === 0) hours = 12;
  if (hours > 12) hours -= 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
}

function parsePlayers(value: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function LeagueInquiryForm({ firebase, className }: LeagueInquiryFormProps) {
  const { settings } = useInquirySettings(firebase);

  const recipients = useMemo(
    () => settings.leaguesDefaultRecipients,
    [settings.leaguesDefaultRecipients],
  );
  const sendEmails = settings.leaguesSendEmails;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [season, setSeason] = useState("");
  const [players, setPlayers] = useState("8");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validators = useMemo(() => {
    const errors: string[] = [];

    if (!firstName.trim() || !TEXT_REGEX.test(firstName.trim())) {
      errors.push("First name is required (letters only).");
    }
    if (!lastName.trim() || !TEXT_REGEX.test(lastName.trim())) {
      errors.push("Last name is required (letters only).");
    }
    if (!phone.trim() || !PHONE_REGEX.test(phone.trim())) {
      errors.push("Phone number is required (US format).");
    }
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      errors.push("A valid email address is required.");
    }
    if (!location.trim()) {
      errors.push("Please select a location.");
    }
    if (!preferredTime.trim()) {
      errors.push("Preferred time is required.");
    }
    if (!season.trim()) {
      errors.push("Please select a season.");
    }
    const playerCount = parsePlayers(players);
    if (playerCount === null || playerCount < 1 || playerCount > 20) {
      errors.push("Please select the number of players.");
    }

    return { isInvalid: errors.length > 0, errors, playerCount };
  }, [email, firstName, lastName, location, phone, players, preferredTime, season]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setLocation("");
    setPreferredTime("");
    setSeason("");
    setPlayers("8");
    setMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validators.isInvalid) {
      setErrorMessage(validators.errors[0] ?? "Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const preferredTimeDisplay = convertTo12HourFormat(preferredTime.trim());
      const playerCount = validators.playerCount ?? 0;

      const docRef = await addDoc(firebase.leaguesInquiriesRef(), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: location.trim(),
        preferredTime: preferredTime.trim(),
        preferredTimeDisplay,
        season: season.trim(),
        players: playerCount,
        message: message.trim() || null,
        emailTo: sendEmails ? recipients : [],
        createdAt: serverTimestamp(),
      });

      if (sendEmails) {
        const response = await fetch("/api/inquiries/leagues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiryId: docRef.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            location: location.trim(),
            preferredTime: preferredTime.trim(),
            preferredTimeDisplay,
            season: season.trim(),
            players: playerCount,
            message: message.trim() || null,
            emailTo: recipients,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to send inquiry.");
        }
      }

      setSubmitted(true);
      resetForm();
    } catch (error) {
      console.error("[LeagueInquiryForm] submit failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={clsx("rounded-3xl border border-primary/30 bg-primary/10 px-6 py-8", className)}>
        <p className="text-xl font-semibold uppercase tracking-wide text-primary">
          Your inquiry has been sent to The Bunker!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
    >
      <FormCard>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Leagues
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            Interested in creating or joining a league?
          </h2>
          <p className="text-sm text-white/70">
            Complete the form and we&apos;ll reach out with more info.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <TextInput
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </Field>

          <Field label="Last Name" required>
            <TextInput
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone" required>
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field label="Email" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Location" required>
            <Select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            >
              <option value="">Select a location</option>
              {LOCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Preferred Time" required>
            <TextInput
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
            />
          </Field>

          <Field label="Season" required>
            <Select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              required
            >
              <option value="">Select a season</option>
              {SEASON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Number of Players" required className="md:col-span-2">
            <Select
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              required
            >
              {Array.from({ length: 13 }).map((_, index) => {
                const value = 8 + index;
                return (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                );
              })}
            </Select>
          </Field>

          <Field label="Message" className="md:col-span-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
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
  );
}
