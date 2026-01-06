"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import type Firebase from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Field, FormCard, Select, TextInput, Textarea } from "@/components/ui/Form";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import type { FittingsConfig } from "@/hooks/useFittingsConfig";

type FittingInquiryFormProps = {
  firebase: Firebase;
  config: Pick<FittingsConfig, "interestOptions" | "locationOptions" | "timeOptions">;
  className?: string;
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function FittingInquiryForm({ firebase, config, className }: FittingInquiryFormProps) {
  const { settings } = useInquirySettings(firebase);
  const recipients = useMemo(
    () => settings.fittingsDefaultRecipients,
    [settings.fittingsDefaultRecipients],
  );
  const sendEmails = settings.fittingsSendEmails;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fittingInterest, setFittingInterest] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [timePreference, setTimePreference] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const submitGuardRef = useRef(false);

  const formIsInvalid =
    !name.trim() ||
    !phone.trim() ||
    !email.trim() ||
    !fittingInterest.trim() ||
    !locationPreference.trim() ||
    !timePreference.trim();

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setFittingInterest("");
    setLocationPreference("");
    setTimePreference("");
    setNotes("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitGuardRef.current) {
      return;
    }
    if (formIsInvalid) {
      toast.error("Please fill out all required fields.");
      return;
    }

    submitGuardRef.current = true;
    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        fittingInterest: fittingInterest.trim(),
        locationPreference: locationPreference.trim(),
        timePreference: timePreference.trim(),
        notes: notes.trim() || null,
        emailTo: sendEmails ? recipients : [],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(firebase.fittingsInquiriesRef(), payload);

      if (sendEmails) {
        const response = await fetch("/api/inquiries/fittings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiryId: docRef.id, ...payload }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to send inquiry.");
        }
      }

      resetForm();
      toast.success("Your inquiry has been sent to The Bunker!");
    } catch (error) {
      console.error("[FittingInquiryForm] submit failed", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      submitGuardRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <FormCard>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Fittings
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            Interested in a Club Fitting?
          </h2>
          <p className="text-sm text-white/70">
            Fill out the form below and we will get in touch with you!
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Name" required className="md:col-span-2">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone" required>
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              maxLength={14}
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

          <Field label="Fitting Interest" required className="md:col-span-2">
            <Select
              value={fittingInterest}
              onChange={(e) => setFittingInterest(e.target.value)}
              required
            >
              <option value="">What are you interested in being fitted for?</option>
              {config.interestOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Location Preference" required>
            <Select
              value={locationPreference}
              onChange={(e) => setLocationPreference(e.target.value)}
              required
            >
              <option value="">Select a Location</option>
              {config.locationOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Time Preference" required>
            <Select
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value)}
              required
            >
              <option value="">Select a Time of Day</option>
              {config.timeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Additional Notes" className="md:col-span-2">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            Sent to: <span className="text-white/70">{recipients.join(", ")}</span>
          </p>
          <Button
            type="submit"
            disabled={submitting}
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
