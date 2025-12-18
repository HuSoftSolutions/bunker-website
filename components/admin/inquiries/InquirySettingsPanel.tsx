"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";

type InquirySettingsFormState = {
  careersDefaultRecipients: string;
  lessonsDefaultRecipients: string;
  leaguesDefaultRecipients: string;
  fittingsDefaultRecipients: string;
};

const DEFAULT_STATE: InquirySettingsFormState = {
  careersDefaultRecipients: "careers@getinthebunker.golf",
  lessonsDefaultRecipients: "lessons@getinthebunker.golf",
  leaguesDefaultRecipients: "leagues@getinthebunker.golf",
  fittingsDefaultRecipients: "fittings@getinthebunker.golf",
};

function normalizeEmails(value: string) {
  const parts = value
    .split(/[,\n]/g)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const uniq = new Set(parts);
  return Array.from(uniq);
}

type InquirySettingsPanelProps = {
  firebase: Firebase;
};

export function InquirySettingsPanel({ firebase }: InquirySettingsPanelProps) {
  const [form, setForm] = useState<InquirySettingsFormState>(DEFAULT_STATE);
  const [initial, setInitial] = useState<InquirySettingsFormState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStatus("idle");

    const unsubscribe = onSnapshot(
      firebase.inquirySettingsRef(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const careers =
          Array.isArray(data?.careersDefaultRecipients)
            ? data.careersDefaultRecipients.join(", ")
            : typeof data?.careersDefaultRecipients === "string"
              ? data.careersDefaultRecipients
              : DEFAULT_STATE.careersDefaultRecipients;

        const lessons =
          Array.isArray(data?.lessonsDefaultRecipients)
            ? data.lessonsDefaultRecipients.join(", ")
            : typeof data?.lessonsDefaultRecipients === "string"
              ? data.lessonsDefaultRecipients
              : DEFAULT_STATE.lessonsDefaultRecipients;

        const next = {
          careersDefaultRecipients: careers,
          lessonsDefaultRecipients: lessons,
          leaguesDefaultRecipients:
            Array.isArray(data?.leaguesDefaultRecipients)
              ? data.leaguesDefaultRecipients.join(", ")
              : typeof data?.leaguesDefaultRecipients === "string"
                ? data.leaguesDefaultRecipients
                : DEFAULT_STATE.leaguesDefaultRecipients,
          fittingsDefaultRecipients:
            Array.isArray(data?.fittingsDefaultRecipients)
              ? data.fittingsDefaultRecipients.join(", ")
              : typeof data?.fittingsDefaultRecipients === "string"
                ? data.fittingsDefaultRecipients
                : DEFAULT_STATE.fittingsDefaultRecipients,
        };
        setForm(next);
        setInitial(next);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[InquirySettings] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const hasChanges = useMemo(() => {
    return (
      form.careersDefaultRecipients !== initial.careersDefaultRecipients ||
      form.lessonsDefaultRecipients !== initial.lessonsDefaultRecipients ||
      form.leaguesDefaultRecipients !== initial.leaguesDefaultRecipients ||
      form.fittingsDefaultRecipients !== initial.fittingsDefaultRecipients
    );
  }, [form, initial]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setStatus("idle");

    try {
      await setDoc(
        firebase.inquirySettingsRef(),
        {
          careersDefaultRecipients: normalizeEmails(form.careersDefaultRecipients),
          lessonsDefaultRecipients: normalizeEmails(form.lessonsDefaultRecipients),
          leaguesDefaultRecipients: normalizeEmails(form.leaguesDefaultRecipients),
          fittingsDefaultRecipients: normalizeEmails(form.fittingsDefaultRecipients),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setStatus("success");
    } catch (err: unknown) {
      console.error("[InquirySettings] save failed", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Inquiry Settings
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Configure default recipients for in-house forms (careers, lessons). Location-specific career emails still override the default when present.
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
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Settings saved.
        </div>
      ) : null}
      {status === "error" && error ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error.message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Careers
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Comma or newline separated list of recipient emails.
          </p>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Default Recipient Emails
            </span>
            <textarea
              value={form.careersDefaultRecipients}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  careersDefaultRecipients: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="careers@getinthebunker.golf"
            />
          </label>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Lessons
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Comma or newline separated list of recipient emails.
          </p>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Default Recipient Emails
            </span>
            <textarea
              value={form.lessonsDefaultRecipients}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  lessonsDefaultRecipients: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="lessons@getinthebunker.golf"
            />
          </label>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Leagues
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Comma or newline separated list of recipient emails.
          </p>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Default Recipient Emails
            </span>
            <textarea
              value={form.leaguesDefaultRecipients}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  leaguesDefaultRecipients: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="leagues@getinthebunker.golf"
            />
          </label>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Fittings
          </h3>
          <p className="mt-2 text-sm text-white/60">
            Comma or newline separated list of recipient emails.
          </p>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Default Recipient Emails
            </span>
            <textarea
              value={form.fittingsDefaultRecipients}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  fittingsDefaultRecipients: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder="fittings@getinthebunker.golf"
            />
          </label>
        </section>
      </div>
    </div>
  );
}
