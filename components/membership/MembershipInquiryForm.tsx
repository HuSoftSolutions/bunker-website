"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import type Firebase from "@/lib/firebase/client";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import type { MembershipFormContent } from "@/data/membershipContent";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormCard,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui/Form";

const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;
const PHONE_REGEX =
  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

const LOCATION_OPTIONS = [
  "The Bunker Guilderland",
  "The Bunker Clifton Park",
  "The Bunker North Greenbush",
  "The Bunker New Hartford",
  "The Bunker Mohawk Harbor",
  "The Bunker Saratoga",
  "The Bunker Latham",
] as const;

type MembershipInquiryFormProps = {
  firebase: Firebase;
  content: MembershipFormContent;
  paymentLinkUrl?: string;
  className?: string;
};

export function MembershipInquiryForm({
  firebase,
  content,
  paymentLinkUrl,
  className,
}: MembershipInquiryFormProps) {
  const { settings } = useInquirySettings(firebase);
  const recipients = useMemo(
    () => settings.membershipsDefaultRecipients,
    [settings.membershipsDefaultRecipients],
  );
  const sendEmails = settings.membershipsSendEmails;
  const allowedRecipients = useMemo(
    () => recipients.filter((email) => email.endsWith("@getinthebunker.golf")),
    [recipients],
  );
  const canSendEmails = sendEmails && allowedRecipients.length > 0;

  const [email, setEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [primaryLocation, setPrimaryLocation] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [membershipType, setMembershipType] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validators = useMemo(() => {
    const errors: string[] = [];

    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      errors.push("A valid email address is required.");
    }
    if (!recipientName.trim()) {
      errors.push("Recipient name is required.");
    }
    if (!primaryLocation.trim()) {
      errors.push("Please select a primary location.");
    }
    if (!membershipType.trim()) {
      errors.push("Please select a membership type.");
    }
    if (!fullName.trim()) {
      errors.push("Full name is required.");
    }
    if (!phone.trim() || !PHONE_REGEX.test(phone.trim())) {
      errors.push("Phone number is required (US format).");
    }

    return { isInvalid: errors.length > 0, errors };
  }, [email, recipientName, primaryLocation, membershipType, fullName, phone]);

  const resetForm = () => {
    setEmail("");
    setRecipientName("");
    setPrimaryLocation("");
    setReferredBy("");
    setMembershipType("");
    setFullName("");
    setPhone("");
    setNotes("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validators.isInvalid) {
      toast.error(validators.errors[0] ?? "Please fill out all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const docRef = await addDoc(firebase.membershipInquiriesRef(), {
        email: email.trim(),
        recipientName: recipientName.trim(),
        primaryLocation: primaryLocation.trim(),
        referredBy: referredBy.trim() || null,
        membershipType: membershipType.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        notes: notes.trim() || null,
        emailTo: canSendEmails ? allowedRecipients : [],
        createdAt: serverTimestamp(),
      });

      if (canSendEmails) {
        const response = await fetch("/api/inquiries/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inquiryId: docRef.id,
            email: email.trim(),
            recipientName: recipientName.trim(),
            primaryLocation: primaryLocation.trim(),
            referredBy: referredBy.trim() || null,
            membershipType: membershipType.trim(),
            fullName: fullName.trim(),
            phone: phone.trim(),
            notes: notes.trim() || null,
            emailTo: allowedRecipients,
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
      console.error("[MembershipInquiryForm] submit failed", error);
      toast.error(
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
          {content.successTitle}
        </p>
        <p className="mt-3 text-sm text-white/80">{content.successMessage}</p>
        {paymentLinkUrl ? (
          <div className="mt-6">
            <Button href={paymentLinkUrl} target="_blank" rel="noopener noreferrer">
              {content.paymentLinkLabel}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <FormCard>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Membership
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            {content.formTitle}
          </h2>
          <p className="text-sm text-white/70">{content.formDescription}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Email Address" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Recipient Name" required>
            <TextInput
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
          </Field>

          <Field label="Primary Location" required>
            <Select
              value={primaryLocation}
              onChange={(e) => setPrimaryLocation(e.target.value)}
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

          <Field label="Who were you referred by?">
            <TextInput
              type="text"
              value={referredBy}
              onChange={(e) => setReferredBy(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {content.agreementTitle}
          </h3>
          <div className="mt-4 space-y-2 text-sm text-white/75">
            {content.paymentOptions.map((option) => (
              <p key={option}>{option}</p>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {content.perksTitle}
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
              {content.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {content.detailsTitle}
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
              {content.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <Field label={content.membershipTypeLabel} required>
              <Select
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value)}
                required
              >
                <option value="">Select a membership</option>
                {content.membershipTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full Name" required>
            <TextInput
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>

          <Field label="Phone Number" required>
            <TextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            Sent to:{" "}
            <span className="text-white/70">
              {canSendEmails ? allowedRecipients.join(", ") : "Email notifications disabled"}
            </span>
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
