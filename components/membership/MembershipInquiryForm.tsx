"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import type Firebase from "@/lib/firebase/client";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import type { MembershipFormContent, MembershipSeason } from "@/data/membershipContent";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
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
  season?: MembershipSeason;
  seasonOptions?: Array<{
    season: MembershipSeason;
    label: string;
    content: MembershipFormContent;
  }>;
  className?: string;
};

export function MembershipInquiryForm({
  firebase,
  content,
  season,
  seasonOptions,
  className,
}: MembershipInquiryFormProps) {
  const { settings } = useInquirySettings(firebase);
  const { settings: businessSettings } = useBusinessSettings(firebase);
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
  const [selectedSeason, setSelectedSeason] = useState<MembershipSeason | "">(
    season ?? seasonOptions?.[0]?.season ?? "",
  );
  const [membershipType, setMembershipType] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [submittedSeason, setSubmittedSeason] = useState<MembershipSeason | "">("");
  const [submittedMembershipType, setSubmittedMembershipType] = useState("");
  const [submittedPaymentUrl, setSubmittedPaymentUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const submitGuardRef = useRef(false);

  const activeSeason = season ?? (selectedSeason || null);
  const selectedSeasonOption = useMemo(
    () => seasonOptions?.find((option) => option.season === activeSeason) ?? null,
    [activeSeason, seasonOptions],
  );
  const activeContent = selectedSeasonOption?.content ?? content;
  const requiresSeasonSelection = !season && Boolean(seasonOptions?.length);

  useEffect(() => {
    if (!membershipType.trim()) {
      return;
    }
    if (!activeContent.membershipTypes.includes(membershipType)) {
      setMembershipType("");
    }
  }, [activeContent.membershipTypes, membershipType]);

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
    if (requiresSeasonSelection && !activeSeason) {
      errors.push("Please select a membership season.");
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
  }, [
    email,
    recipientName,
    primaryLocation,
    requiresSeasonSelection,
    activeSeason,
    membershipType,
    fullName,
    phone,
  ]);

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
    if (submitGuardRef.current) {
      return;
    }

    if (validators.isInvalid) {
      toast.error(validators.errors[0] ?? "Please fill out all required fields.");
      return;
    }

    submitGuardRef.current = true;
    setSubmitting(true);

    try {
      const docRef = await addDoc(firebase.membershipInquiriesRef(), {
        email: email.trim(),
        recipientName: recipientName.trim(),
        primaryLocation: primaryLocation.trim(),
        referredBy: referredBy.trim() || null,
        membershipSeason: activeSeason ?? null,
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
            membershipSeason: activeSeason ?? null,
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

      const submittedType = membershipType.trim();
      resetForm();
      setPaymentModalOpen(true);
      setSubmittedSeason(activeSeason ?? "");
      setSubmittedMembershipType(submittedType);
      setSubmittedPaymentUrl(resolvePaymentUrl(submittedType, activeSeason));
      toast.success(activeContent.successTitle);
    } catch (error) {
      console.error("[MembershipInquiryForm] submit failed", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      submitGuardRef.current = false;
      setSubmitting(false);
    }
  };

  const resolveSeasonSettings = (seasonValue?: MembershipSeason | null) =>
    seasonValue &&
    businessSettings.membershipSeasons &&
    typeof businessSettings.membershipSeasons === "object"
      ? businessSettings.membershipSeasons[seasonValue]
      : null;

  const resolvePaymentUrl = (
    typeValue: string,
    seasonValue?: MembershipSeason | null,
  ) => {
    const seasonSettings = resolveSeasonSettings(seasonValue);
    const paymentLinks =
      seasonSettings?.paymentLinks &&
      typeof seasonSettings.paymentLinks === "object"
        ? seasonSettings.paymentLinks
        : businessSettings.membershipPaymentLinks &&
            typeof businessSettings.membershipPaymentLinks === "object"
          ? businessSettings.membershipPaymentLinks
          : {};
    const typePaymentUrl =
      typeValue && typeof paymentLinks[typeValue] === "string"
        ? paymentLinks[typeValue].trim()
        : "";
    const defaultUrl =
      typeof seasonSettings?.paymentUrl === "string" && seasonSettings.paymentUrl.trim()
        ? seasonSettings.paymentUrl.trim()
        : typeof businessSettings.membershipPaymentUrl === "string"
          ? businessSettings.membershipPaymentUrl.trim()
        : "";
    return typePaymentUrl || defaultUrl;
  };
  const paymentUrl =
    submittedPaymentUrl ||
    resolvePaymentUrl(submittedMembershipType, (submittedSeason || activeSeason) as MembershipSeason | null);

  return (
    <form onSubmit={handleSubmit} className={className}>
      <FormCard className="border border-white/10 bg-zinc-900/70">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
            Membership
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wide text-white">
            {activeContent.formTitle}
          </h2>
          <p className="text-sm text-white/70">{activeContent.formDescription}</p>
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
          {requiresSeasonSelection ? (
            <Field label="Membership Season" required>
              <Select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value as MembershipSeason | "")}
                required
              >
                <option value="">Select a season</option>
                {(seasonOptions ?? []).map((option) => (
                  <option key={option.season} value={option.season}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className={clsx(requiresSeasonSelection ? "mt-6" : "")}>
            <Field label={activeContent.membershipTypeLabel} required>
              <Select
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value)}
                required
              >
                <option value="">Select a membership</option>
                {activeContent.membershipTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
          {requiresSeasonSelection && !activeSeason ? (
            <p className="text-sm text-white/70">
              Select a membership season above to view payment options and details.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                {activeContent.agreementTitle}
              </h3>
              {activeContent.sectionVisibility.paymentOptions ? (
                <div className="mt-4 space-y-2 text-sm text-white/75">
                  {activeContent.paymentOptions.map((option) => (
                    <p key={option}>{option}</p>
                  ))}
                </div>
              ) : null}

              {activeContent.sectionVisibility.plans ? (
                <div className="mt-6 space-y-3">
                  {activeContent.plansTitle ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      {activeContent.plansTitle}
                    </p>
                  ) : null}
                  {activeContent.plans.map((plan, index) => (
                    <div
                      key={`${plan.name || "plan"}-${index}`}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="text-sm font-semibold text-white">
                        {plan.name || `Plan ${index + 1}`}{" "}
                        {plan.price ? (
                          <span className="font-normal text-primary">{plan.price}</span>
                        ) : null}
                      </p>
                      {plan.features.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75">
                          {plan.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                      ) : null}
                      {plan.bestFor ? (
                        <p className="mt-2 text-sm text-white/75">
                          <span className="font-semibold text-white">Best for: </span>
                          {plan.bestFor}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {activeContent.sectionVisibility.perks ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    {activeContent.perksTitle}
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                    {activeContent.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeContent.sectionVisibility.details ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    {activeContent.detailsTitle}
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                    {activeContent.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
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

      {paymentUrl ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/65">
            Need to pay?
          </p>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-red-600 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            Complete Payment
          </a>
        </div>
      ) : null}

      <Dialog
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSubmittedSeason("");
          setSubmittedMembershipType("");
          setSubmittedPaymentUrl("");
        }}
        size="lg"
      >
        <DialogTitle>{activeContent.successTitle}</DialogTitle>
        <DialogDescription>{activeContent.successMessage}</DialogDescription>
        <DialogBody>
          {paymentUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Complete payment to finalize your membership.
              </p>
              <Button href={paymentUrl} target="_blank" rel="noreferrer">
                {activeContent.paymentLinkLabel}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-white/70">
              A team member will share the payment link shortly.
            </p>
          )}
        </DialogBody>
        <DialogActions>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setPaymentModalOpen(false);
              setSubmittedSeason("");
              setSubmittedMembershipType("");
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}
