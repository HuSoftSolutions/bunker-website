"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";
import { Field, FormCard, TextInput, Textarea, ErrorBox } from "@/components/ui/Form";

type ProgramForm = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
};

type RateForm = {
  id: string;
  title: string;
  lines: string;
};

type JuniorGolfFormState = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroImageUrl: string;
  programs: ProgramForm[];
  lessonRates: RateForm[];
};

const DEFAULT_STATE: JuniorGolfFormState = {
  heroTitle: "Junior Golf",
  heroSubtitle: "Helping young golfers improve their game",
  heroDescription: "",
  heroImageUrl:
    "https://storage.googleapis.com/thebunker-assets/thebunker/pexels-thomasleeward-2828723.jpg",
  programs: [],
  lessonRates: [],
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

function cloneState(value: JuniorGolfFormState) {
  return JSON.parse(JSON.stringify(value)) as JuniorGolfFormState;
}

type JuniorGolfSettingsPanelProps = {
  firebase: Firebase;
};

export function JuniorGolfSettingsPanel({ firebase }: JuniorGolfSettingsPanelProps) {
  const [form, setForm] = useState<JuniorGolfFormState>(cloneState(DEFAULT_STATE));
  const [initial, setInitial] = useState<JuniorGolfFormState>(cloneState(DEFAULT_STATE));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStatus("idle");

    const unsubscribe = onSnapshot(
      firebase.juniorGolfConfigRef(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const next: JuniorGolfFormState = {
          heroTitle:
            typeof data?.heroTitle === "string" && data.heroTitle.trim()
              ? data.heroTitle
              : DEFAULT_STATE.heroTitle,
          heroSubtitle: typeof data?.heroSubtitle === "string" ? data.heroSubtitle : DEFAULT_STATE.heroSubtitle,
          heroDescription: typeof data?.heroDescription === "string" ? data.heroDescription : "",
          heroImageUrl: typeof data?.heroImageUrl === "string" ? data.heroImageUrl : DEFAULT_STATE.heroImageUrl,
          programs: Array.isArray(data?.programs)
            ? data.programs
                .map((p: unknown) => {
                  const record = p as Record<string, unknown>;
                  return {
                    id: createId("program"),
                    title: typeof record?.title === "string" ? record.title : "",
                    description:
                      typeof record?.description === "string" ? record.description : "",
                    ctaLabel: typeof record?.ctaLabel === "string" ? record.ctaLabel : "",
                    ctaUrl: typeof record?.ctaUrl === "string" ? record.ctaUrl : "",
                  };
                })
                .filter((p: ProgramForm) => p.title.trim().length > 0)
            : [],
          lessonRates: Array.isArray(data?.lessonRates)
            ? data.lessonRates
                .map((r: unknown) => {
                  const record = r as Record<string, unknown>;
                  return {
                    id: createId("rate"),
                    title: typeof record?.title === "string" ? record.title : "",
                    lines: Array.isArray(record?.lines)
                      ? record.lines.join("\n")
                      : typeof record?.lines === "string"
                        ? record.lines
                        : "",
                  };
                })
                .filter((r: RateForm) => r.title.trim().length > 0)
            : [],
        };

        setForm(cloneState(next));
        setInitial(cloneState(next));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[JuniorGolfSettings] failed to load", err);
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
        programs: form.programs
          .map((p) => ({
            title: p.title.trim(),
            description: p.description.trim() || null,
            ctaLabel: p.ctaLabel.trim() || null,
            ctaUrl: p.ctaUrl.trim() || null,
          }))
          .filter((p) => p.title),
        lessonRates: form.lessonRates
          .map((r) => ({
            title: r.title.trim(),
            lines: normalizeLines(r.lines),
          }))
          .filter((r) => r.title && r.lines.length),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(firebase.juniorGolfConfigRef(), payload, { merge: true });
      setStatus("success");
    } catch (err: unknown) {
      console.error("[JuniorGolfSettings] save failed", err);
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
            Junior Golf
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Manage junior golf hero content, programs/camps, and lesson rates displayed on the site.
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
            Upcoming Programs
          </h3>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                programs: [
                  ...prev.programs,
                  { id: createId("program"), title: "", description: "", ctaLabel: "", ctaUrl: "" },
                ],
              }))
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Program
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.programs.length ? (
            form.programs.map((program, index) => (
              <div
                key={program.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Program {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        programs: prev.programs.filter((_, i) => i !== index),
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
                      value={program.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === index ? { ...p, title: e.target.value } : p,
                          ),
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field label="Description" className="md:col-span-2">
                    <Textarea
                      rows={3}
                      value={program.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === index ? { ...p, description: e.target.value } : p,
                          ),
                        }))
                      }
                    />
                  </Field>

                  <Field label="CTA Label">
                    <TextInput
                      value={program.ctaLabel}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === index ? { ...p, ctaLabel: e.target.value } : p,
                          ),
                        }))
                      }
                      placeholder="Register Now"
                    />
                  </Field>

                  <Field label="CTA URL">
                    <TextInput
                      type="url"
                      inputMode="url"
                      value={program.ctaUrl}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          programs: prev.programs.map((p, i) =>
                            i === index ? { ...p, ctaUrl: e.target.value } : p,
                          ),
                        }))
                      }
                      placeholder="https://example.com"
                    />
                  </Field>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center text-sm text-white/60">
              No programs configured.
            </div>
          )}
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Junior Lesson Rates
          </h3>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                lessonRates: [...prev.lessonRates, { id: createId("rate"), title: "", lines: "" }],
              }))
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Rate
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.lessonRates.length ? (
            form.lessonRates.map((rate, index) => (
              <div
                key={rate.id}
                className="rounded-3xl border border-white/10 bg-black/30 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    Rate {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lessonRates: prev.lessonRates.filter((_, i) => i !== index),
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
                      value={rate.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lessonRates: prev.lessonRates.map((r, i) =>
                            i === index ? { ...r, title: e.target.value } : r,
                          ),
                        }))
                      }
                      required
                    />
                  </Field>

                  <Field label="Lines (one per line)" className="md:col-span-2">
                    <Textarea
                      rows={3}
                      value={rate.lines}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          lessonRates: prev.lessonRates.map((r, i) =>
                            i === index ? { ...r, lines: e.target.value } : r,
                          ),
                        }))
                      }
                      placeholder="One Hour: $125\nHalf Hour: $65"
                    />
                  </Field>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center text-sm text-white/60">
              No rates configured.
            </div>
          )}
        </div>
      </FormCard>
    </div>
  );
}
