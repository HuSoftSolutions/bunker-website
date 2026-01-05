"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import type Firebase from "@/lib/firebase/client";
import useLocations from "@/hooks/useLocations";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import { Button } from "@/components/ui/Button";
import { ErrorBox, Field, FileInput, FormCard, Select, TextInput, Textarea } from "@/components/ui/Form";

type CareerApplicationFormProps = {
  firebase: Firebase;
  className?: string;
};

type ResumeMeta = {
  url: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
};

const POSITION_OPTIONS = [
  "Bartender",
  "Server",
  "Manager",
  "Chef/Kitchen Staff",
  "Golf Instructor",
  "Other",
] as const;

const isAllowedResumeType = (mimeType: string) =>
  mimeType === "application/pdf" ||
  mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatLocationId(value: string) {
  return value.replace(", NY", "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseEmails(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const uniq = new Set<string>();
  list.forEach((email) => {
    if (typeof email === "string" && email.trim()) {
      uniq.add(email.trim());
    }
  });
  return Array.from(uniq);
}

async function uploadResume(firebase: Firebase, file: File): Promise<ResumeMeta> {
  const safeName = file.name.replace(/[^\w.\-()]+/g, "_");
  const storagePath = `thebunker/resumes/${Date.now()}_${safeName}`;
  const objectRef = storageRef(firebase.storage, storagePath);
  await uploadBytes(objectRef, file, { contentType: file.type });
  const url = await getDownloadURL(objectRef);
  return { url, storagePath, fileName: file.name, mimeType: file.type };
}

export function CareerApplicationForm({ firebase, className }: CareerApplicationFormProps) {
  const { locations } = useLocations(firebase);
  const { settings } = useInquirySettings(firebase);

  const locationOptions = useMemo(() => {
    const values = locations
      .map((location) => {
        const name = typeof location.name === "string" ? location.name : "";
        if (!name) return null;
        return { id: location.id ?? formatLocationId(name), label: name };
      })
      .filter(Boolean) as Array<{ id: string; label: string }>;
    values.sort((a, b) => a.label.localeCompare(b.label));
    return values;
  }, [locations]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState("");
  const [position, setPosition] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [message, setMessage] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedLocationLabel = useMemo(() => {
    if (!locationId) {
      return "";
    }
    return locationOptions.find((option) => option.id === locationId)?.label ?? "";
  }, [locationId, locationOptions]);

  const resolvedRecipients = useMemo(() => {
    if (!locationId) {
      return settings.careersDefaultRecipients;
    }

    const target = locations.find((loc) => loc.id === locationId);
    const locationEmails = parseEmails(target?.careerEmails);
    return locationEmails.length ? locationEmails : settings.careersDefaultRecipients;
  }, [locationId, locations, settings.careersDefaultRecipients]);
  const sendEmails = settings.careersSendEmails;

  const formIsInvalid =
    !firstName.trim() ||
    !lastName.trim() ||
    !phone.trim() ||
    !email.trim() ||
    !message.trim() ||
    !position.trim() ||
    !locationId.trim() ||
    !selectedLocationLabel.trim() ||
    !skillLevel.trim();

  const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setResume(null);
      setErrorMessage("");
      return;
    }

    if (!isAllowedResumeType(file.type)) {
      setResume(null);
      setErrorMessage("Only PDF and .docx files are allowed");
      return;
    }

    setResume(file);
    setErrorMessage("");
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setLocationId("");
    setPosition("");
    setSkillLevel("");
    setResume(null);
    setErrorMessage("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formIsInvalid) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      let resumeMeta: ResumeMeta | null = null;
      if (resume) {
        resumeMeta = await uploadResume(firebase, resume);
      }

      const docRef = await addDoc(firebase.careerInquiriesRef(), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: selectedLocationLabel.trim(),
        position: position.trim(),
        skillLevel: skillLevel.trim(),
        message: message.trim(),
        emailTo: sendEmails ? resolvedRecipients : [],
        resumeUrl: resumeMeta?.url ?? null,
        resumeFileName: resumeMeta?.fileName ?? null,
        resumeMimeType: resumeMeta?.mimeType ?? null,
        resumeStoragePath: resumeMeta?.storagePath ?? null,
        createdAt: serverTimestamp(),
      });

      if (sendEmails) {
        const response = await fetch("/api/inquiries/careers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiryId: docRef.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            location: selectedLocationLabel.trim(),
            position: position.trim(),
            skillLevel: skillLevel.trim(),
            message: message.trim(),
            resumeUrl: resumeMeta?.url ?? null,
            resumeFileName: resumeMeta?.fileName ?? null,
            resumeMimeType: resumeMeta?.mimeType ?? null,
            emailTo: resolvedRecipients,
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
      console.error("[CareerApplicationForm] submit failed", error);
      const message = (() => {
        if (error instanceof Error) {
          if (error.message.includes("SENDGRID_API_KEY")) {
            return "Email sending isn’t configured right now. Please try again later.";
          }
          return error.message;
        }
        return "Something went wrong. Please try again.";
      })();

      setErrorMessage(message);
      setToastMessage(message);
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
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm rounded-2xl border border-rose-500/40 bg-zinc-950 px-4 py-3 text-sm text-rose-50 shadow-2xl shadow-black/50">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-rose-300" />
            <div className="flex-1">
              <p className="font-semibold uppercase tracking-wide text-rose-100">
                Request Failed
              </p>
              <p className="mt-1 text-rose-100/80">{toastMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs uppercase tracking-wide text-rose-100/70 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <FormCard>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Careers
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            Apply Now
          </h2>
          <p className="text-sm text-white/70">
            Submit your information and we&apos;ll route it to the appropriate team.
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
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
            >
              <option value="">Select a Location</option>
              {locationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Position" required>
            <Select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            >
              <option value="">Select a Position</option>
              {POSITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Skill Level" required className="md:col-span-2">
            <TextInput
              type="text"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              required
            />
          </Field>

          <Field label="Details / Past Experience" required className="md:col-span-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </Field>

          <Field label="Resume (PDF or .docx)" className="md:col-span-2">
            <FileInput
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
            />
          </Field>
        </div>

        {errorMessage ? <ErrorBox className="mt-4">{errorMessage}</ErrorBox> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            Sent to: <span className="text-white/70">{resolvedRecipients.join(", ")}</span>
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
