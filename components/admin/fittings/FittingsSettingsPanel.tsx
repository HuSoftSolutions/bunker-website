"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";
import { ErrorBox, Field, FormCard, TextInput, Textarea } from "@/components/ui/Form";

type FeeItemForm = {
  id: string;
  title: string;
  description: string;
};

type FittingsConfigForm = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImageUrl: string;
  feeNote: string;
  feeItems: FeeItemForm[];
  interestOptions: string;
  locationOptions: string;
  timeOptions: string;
};

const DEFAULT_STATE: FittingsConfigForm = {
  heroTitle: "Club Fitting",
  heroSubtitle: "",
  heroDescription: "Get a personalized fitting from our golf professionals",
  heroImageUrl:
    "https://storage.googleapis.com/thebunker-assets/thebunker/pexels-thomasleeward-2828723.jpg",
  feeNote:
    "The fitting fee will be waived if a purchase/order is made the same day as the fitting or will be applied to a purchase/order made within one week of the fitting.",
  feeItems: [
    {
      id: "fee_1",
      title: "Driver, Fairway Wood, or Hybrid Fitting",
      description: "$75 — Takes about 1 hour",
    },
    { id: "fee_2", title: "Iron Fitting", description: "$75 — Takes about 1 hour" },
    { id: "fee_3", title: "Full Bag Fitting", description: "$125 — Takes 1.5–2 hours" },
  ],
  interestOptions: "Driver, Fairway Wood, or Hybrid\nIron\nFull Bag",
  locationOptions:
    "Guilderland, NY\nClifton Park, NY\nNorth Greenbush, NY\nLatham, NY\nSaratoga, NY\nOther",
  timeOptions: "Morning\nAfternoon\nEvening",
};

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function normalizeLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type FittingsSettingsPanelProps = {
  firebase: Firebase;
};

export function FittingsSettingsPanel({ firebase }: FittingsSettingsPanelProps) {
  const [form, setForm] = useState<FittingsConfigForm>(cloneState(DEFAULT_STATE));
  const [initial, setInitial] = useState<FittingsConfigForm>(cloneState(DEFAULT_STATE));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStatus("idle");

    const unsubscribe = onSnapshot(
      firebase.fittingsConfigRef(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};

        const feeItems = Array.isArray(data?.feeItems)
          ? data.feeItems
              .map((item: any) => ({
                id: createId("fee"),
                title: typeof item?.title === "string" ? item.title : "",
                description: typeof item?.description === "string" ? item.description : "",
              }))
              .filter((item: FeeItemForm) => item.title.trim().length > 0)
          : cloneState(DEFAULT_STATE.feeItems);

        const next: FittingsConfigForm = {
          heroTitle: typeof data?.heroTitle === "string" ? data.heroTitle : DEFAULT_STATE.heroTitle,
          heroSubtitle: typeof data?.heroSubtitle === "string" ? data.heroSubtitle : "",
          heroDescription: typeof data?.heroDescription === "string" ? data.heroDescription : DEFAULT_STATE.heroDescription,
          heroImageUrl: typeof data?.heroImageUrl === "string" ? data.heroImageUrl : DEFAULT_STATE.heroImageUrl,
          feeNote: typeof data?.feeNote === "string" ? data.feeNote : DEFAULT_STATE.feeNote,
          feeItems,
          interestOptions: Array.isArray(data?.interestOptions)
            ? data.interestOptions.join("\n")
            : typeof data?.interestOptions === "string"
              ? data.interestOptions
              : DEFAULT_STATE.interestOptions,
          locationOptions: Array.isArray(data?.locationOptions)
            ? data.locationOptions.join("\n")
            : typeof data?.locationOptions === "string"
              ? data.locationOptions
              : DEFAULT_STATE.locationOptions,
          timeOptions: Array.isArray(data?.timeOptions)
            ? data.timeOptions.join("\n")
            : typeof data?.timeOptions === "string"
              ? data.timeOptions
              : DEFAULT_STATE.timeOptions,
        };

        setForm(cloneState(next));
        setInitial(cloneState(next));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[FittingsSettings] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setStatus("idle");

    try {
      const payload = {
        heroTitle: form.heroTitle.trim() || DEFAULT_STATE.heroTitle,
        heroSubtitle: form.heroSubtitle.trim() || null,
        heroDescription: form.heroDescription.trim() || null,
        heroImageUrl: form.heroImageUrl.trim() || null,
        feeNote: form.feeNote.trim() || null,
        feeItems: form.feeItems
          .map((item) => ({
            title: item.title.trim(),
            description: item.description.trim() || null,
          }))
          .filter((item) => item.title),
        interestOptions: normalizeLines(form.interestOptions),
        locationOptions: normalizeLines(form.locationOptions),
        timeOptions: normalizeLines(form.timeOptions),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(firebase.fittingsConfigRef(), payload, { merge: true });
      setStatus("success");
    } catch (err: unknown) {
      console.error("[FittingsSettings] save failed", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Fittings
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Manage club fitting hero content, fitting fees, and inquiry form options.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving || !hasChanges}
          className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {status === "success" ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Saved.
        </div>
      ) : null}
      {status === "error" && error ? <ErrorBox>{error.message}</ErrorBox> : null}

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero Title" required className="md:col-span-2">
            <TextInput
              value={form.heroTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
              required
              disabled={loading}
            />
          </Field>
          <Field label="Hero Subtitle" className="md:col-span-2">
            <TextInput
              value={form.heroSubtitle}
              onChange={(e) => setForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Hero Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.heroDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, heroDescription: e.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Hero Image URL" className="md:col-span-2">
            <TextInput
              type="url"
              inputMode="url"
              value={form.heroImageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, heroImageUrl: e.target.value }))}
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Fitting Fees
          </h3>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                feeItems: [...prev.feeItems, { id: createId("fee"), title: "", description: "" }],
              }))
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Fee
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.feeItems.map((item, index) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Fee {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      feeItems: prev.feeItems.filter((fee) => fee.id !== item.id),
                    }))
                  }
                  className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Title" required className="md:col-span-2">
                  <TextInput
                    value={item.title}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        feeItems: prev.feeItems.map((fee) =>
                          fee.id === item.id ? { ...fee, title: e.target.value } : fee,
                        ),
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="Description" className="md:col-span-2">
                  <TextInput
                    value={item.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        feeItems: prev.feeItems.map((fee) =>
                          fee.id === item.id ? { ...fee, description: e.target.value } : fee,
                        ),
                      }))
                    }
                    placeholder="$75 — Takes about 1 hour"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Field label="Fee Note">
            <Textarea
              rows={3}
              value={form.feeNote}
              onChange={(e) => setForm((prev) => ({ ...prev, feeNote: e.target.value }))}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
          Inquiry Form Options
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Enter one option per line.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Fitting Interest Options" className="md:col-span-2">
            <Textarea
              rows={4}
              value={form.interestOptions}
              onChange={(e) => setForm((prev) => ({ ...prev, interestOptions: e.target.value }))}
            />
          </Field>
          <Field label="Location Options">
            <Textarea
              rows={6}
              value={form.locationOptions}
              onChange={(e) => setForm((prev) => ({ ...prev, locationOptions: e.target.value }))}
            />
          </Field>
          <Field label="Time Options">
            <Textarea
              rows={6}
              value={form.timeOptions}
              onChange={(e) => setForm((prev) => ({ ...prev, timeOptions: e.target.value }))}
            />
          </Field>
        </div>
      </FormCard>
    </div>
  );
}

