"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import { Button } from "@/components/ui/Button";
import { ErrorBox, Field, FormCard, Select, TextInput, Textarea } from "@/components/ui/Form";

type EventsInquiryFormProps = {
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

const CONTACT_PREFERENCE_OPTIONS = ["Phone", "Email"] as const;

const HEAR_ABOUT_OPTIONS = [
  "Google Search",
  "Social Media",
  "Friend / Family",
  "Walk-in",
  "Email",
  "Other",
] as const;

function parseHeadcount(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

export function EventsInquiryForm({ firebase, className }: EventsInquiryFormProps) {
  const { settings } = useInquirySettings(firebase);
  const recipients = useMemo(
    () => settings.eventsDefaultRecipients,
    [settings.eventsDefaultRecipients],
  );
  const sendEmails = settings.eventsSendEmails;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneExt, setPhoneExt] = useState("");
  const [company, setCompany] = useState("");
  const [contactPreference, setContactPreference] = useState("");
  const [eventType, setEventType] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [heardAbout, setHeardAbout] = useState("");

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
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      errors.push("A valid email address is required.");
    }
    if (!phone.trim() || !PHONE_REGEX.test(phone.trim())) {
      errors.push("Phone number is required (US format).");
    }
    if (!contactPreference.trim()) {
      errors.push("Please select a contact preference.");
    }
    if (!eventType.trim()) {
      errors.push("Please describe the nature of your event.");
    }
    if (!location.trim()) {
      errors.push("Please select a location.");
    }
    if (!eventDate.trim()) {
      errors.push("Please choose an event date.");
    }
    if (!startTime.trim()) {
      errors.push("Please enter a start time.");
    }
    if (!endTime.trim()) {
      errors.push("Please enter an end time.");
    }
    const count = parseHeadcount(headcount);
    if (!headcount.trim() || count === null || count < 1) {
      errors.push("Please provide the number of people attending.");
    }
    if (!heardAbout.trim()) {
      errors.push("Please tell us how you heard about us.");
    }

    return { isInvalid: errors.length > 0, errors, headcount: count ?? 0 };
  }, [
    firstName,
    lastName,
    email,
    phone,
    contactPreference,
    eventType,
    location,
    eventDate,
    startTime,
    endTime,
    headcount,
    heardAbout,
  ]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPhoneExt("");
    setCompany("");
    setContactPreference("");
    setEventType("");
    setLocation("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setHeadcount("");
    setAdditionalInfo("");
    setHeardAbout("");
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
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        phoneExt: phoneExt.trim() || null,
        company: company.trim() || null,
        contactPreference: contactPreference.trim(),
        eventType: eventType.trim(),
        location: location.trim(),
        eventDate: eventDate.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        headcount: validators.headcount,
        additionalInfo: additionalInfo.trim() || null,
        heardAbout: heardAbout.trim(),
        emailTo: sendEmails ? recipients : [],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(firebase.eventsInquiriesRef(), payload);

      if (sendEmails) {
        const response = await fetch("/api/inquiries/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiryId: docRef.id, ...payload }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to send inquiry.");
        }
      }

      setSubmitted(true);
      resetForm();
    } catch (error) {
      console.error("[EventsInquiryForm] submit failed", error);
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
          Your event inquiry has been sent to The Bunker!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <FormCard>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Events
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            Plan an unforgettable event
          </h2>
          <p className="text-sm text-white/70">
            Share the details below and our events team will reach out with availability and next
            steps.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <TextInput
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </Field>
          <Field label="Email Address" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </Field>
          <Field label="Phone Number" required>
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Phone Extension">
            <TextInput
              type="text"
              value={phoneExt}
              onChange={(e) => setPhoneExt(e.target.value)}
              placeholder="Ext."
            />
          </Field>
          <Field label="Company">
            <TextInput
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company (optional)"
            />
          </Field>
          <Field label="Contact Preference" required className="md:col-span-2">
            <Select
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value)}
            >
              <option value="">Select a preference</option>
              {CONTACT_PREFERENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
            Event Details
          </h3>
          <Field
            label="Nature of this Event (e.g., Birthday Party or Business Dinner)"
            required
          >
            <Textarea
              rows={3}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Tell us what you're planning."
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Location" required>
              <Select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Select a location</option>
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Event Date" required>
              <TextInput
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </Field>
            <Field label="Start Time" required>
              <TextInput
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            <Field label="End Time" required>
              <TextInput
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
            <Field label="Number of People" required>
              <TextInput
                type="number"
                min={1}
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Is there any additional information you would like to add?">
            <Textarea
              rows={3}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Share any special requests or details."
            />
          </Field>
          <Field label="How did you hear about us?" required>
            <Select
              value={heardAbout}
              onChange={(e) => setHeardAbout(e.target.value)}
            >
              <option value="">Select an option</option>
              {HEAR_ABOUT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {errorMessage ? (
          <ErrorBox className="mt-6">{errorMessage}</ErrorBox>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            className={clsx(
              "w-full sm:w-auto",
              submitting && "opacity-60 pointer-events-none",
            )}
          >
            {submitting ? "Submitting..." : "Send Inquiry"}
          </Button>
          <p className="text-xs text-white/50">
            We&apos;ll review availability and follow up with next steps.
          </p>
        </div>
      </FormCard>
    </form>
  );
}
