"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";
import { Field, FormCard, TextInput, Textarea, ErrorBox } from "@/components/ui/Form";
import { Button } from "@/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui-kit/table";
import { Text, TextLink } from "@/ui-kit/text";

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

function getLineItems(value: string) {
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
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programEditingIndex, setProgramEditingIndex] = useState<number | null>(null);
  const [programDraft, setProgramDraft] = useState<ProgramForm>({
    id: createId("program"),
    title: "",
    description: "",
    ctaLabel: "",
    ctaUrl: "",
  });
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateEditingIndex, setRateEditingIndex] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState<RateForm>({
    id: createId("rate"),
    title: "",
    lines: "",
  });

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

  const openProgramModal = (index: number | null) => {
    if (index === null) {
      setProgramDraft({
        id: createId("program"),
        title: "",
        description: "",
        ctaLabel: "",
        ctaUrl: "",
      });
      setProgramEditingIndex(null);
    } else {
      setProgramDraft({ ...form.programs[index] });
      setProgramEditingIndex(index);
    }
    setProgramModalOpen(true);
  };

  const closeProgramModal = () => {
    setProgramModalOpen(false);
    setProgramEditingIndex(null);
  };

  const saveProgramDraft = () => {
    setForm((prev) => {
      const nextPrograms = [...prev.programs];
      if (programEditingIndex === null) {
        nextPrograms.push(programDraft);
      } else {
        nextPrograms[programEditingIndex] = programDraft;
      }
      return { ...prev, programs: nextPrograms };
    });
    closeProgramModal();
  };

  const openRateModal = (index: number | null) => {
    if (index === null) {
      setRateDraft({
        id: createId("rate"),
        title: "",
        lines: "",
      });
      setRateEditingIndex(null);
    } else {
      setRateDraft({ ...form.lessonRates[index] });
      setRateEditingIndex(index);
    }
    setRateModalOpen(true);
  };

  const closeRateModal = () => {
    setRateModalOpen(false);
    setRateEditingIndex(null);
  };

  const saveRateDraft = () => {
    setForm((prev) => {
      const nextRates = [...prev.lessonRates];
      if (rateEditingIndex === null) {
        nextRates.push(rateDraft);
      } else {
        nextRates[rateEditingIndex] = rateDraft;
      }
      return { ...prev, lessonRates: nextRates };
    });
    closeRateModal();
  };

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
          <Button outline onClick={() => openProgramModal(null)}>
            Add Program
          </Button>
        </div>

        <div className="mt-6">
          {form.programs.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Program</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>CTA</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.programs.map((program, index) => {
                    const description = program.description.trim() || "—";
                    const ctaLabel = program.ctaLabel.trim();
                    const ctaUrl = program.ctaUrl.trim();
                    const ctaText = ctaLabel || ctaUrl || "—";

                    return (
                      <TableRow key={program.id}>
                        <TableCell className="text-white">
                          {program.title || `Program ${index + 1}`}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-white/70">
                          {description}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {ctaUrl ? (
                            <TextLink href={ctaUrl} target="_blank" rel="noopener noreferrer">
                              {ctaText}
                            </TextLink>
                          ) : (
                            ctaText
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button outline onClick={() => openProgramModal(index)}>
                              Edit
                            </Button>
                            <Button
                              color="red"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  programs: prev.programs.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center">
              <Text className="text-sm text-white/60">No programs configured.</Text>
            </div>
          )}
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Junior Lesson Rates
          </h3>
          <Button outline onClick={() => openRateModal(null)}>
            Add Rate
          </Button>
        </div>

        <div className="mt-6">
          {form.lessonRates.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Rate</TableHeader>
                    <TableHeader>Lines</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.lessonRates.map((rate, index) => {
                    const lineItems = getLineItems(rate.lines);
                    const preview = lineItems[0] || "—";
                    const countLabel =
                      lineItems.length > 0 ? `${lineItems.length} lines` : "No lines";

                    return (
                      <TableRow key={rate.id}>
                        <TableCell className="text-white">
                          {rate.title || `Rate ${index + 1}`}
                        </TableCell>
                        <TableCell className="text-white/70">
                          <div className="text-xs uppercase tracking-wide text-white/50">
                            {countLabel}
                          </div>
                          <div className="max-w-[280px] truncate text-sm text-white/70">
                            {preview}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button outline onClick={() => openRateModal(index)}>
                              Edit
                            </Button>
                            <Button
                              color="red"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  lessonRates: prev.lessonRates.filter((_, i) => i !== index),
                                }))
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center">
              <Text className="text-sm text-white/60">No rates configured.</Text>
            </div>
          )}
        </div>
      </FormCard>

      {programModalOpen ? (
        <Dialog open={programModalOpen} onClose={closeProgramModal}>
          <DialogTitle>
            {programEditingIndex === null ? "Add Program" : "Edit Program"}
          </DialogTitle>
          <DialogDescription>
            Update the program details shown on the junior golf page.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" required className="md:col-span-2">
                <TextInput
                  value={programDraft.title}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={programDraft.description}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="CTA Label">
                <TextInput
                  value={programDraft.ctaLabel}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({
                      ...prev,
                      ctaLabel: event.target.value,
                    }))
                  }
                  placeholder="Register Now"
                />
              </Field>
              <Field label="CTA URL">
                <TextInput
                  type="url"
                  inputMode="url"
                  value={programDraft.ctaUrl}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({
                      ...prev,
                      ctaUrl: event.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                />
              </Field>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeProgramModal}>
              Cancel
            </Button>
            <Button color="red" onClick={saveProgramDraft}>
              {programEditingIndex === null ? "Add Program" : "Save Program"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {rateModalOpen ? (
        <Dialog open={rateModalOpen} onClose={closeRateModal}>
          <DialogTitle>
            {rateEditingIndex === null ? "Add Rate" : "Edit Rate"}
          </DialogTitle>
          <DialogDescription>
            Update the lesson rate details shown on the junior golf page.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4">
              <Field label="Title" required>
                <TextInput
                  value={rateDraft.title}
                  onChange={(event) =>
                    setRateDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Lines (one per line)">
                <Textarea
                  rows={4}
                  value={rateDraft.lines}
                  onChange={(event) =>
                    setRateDraft((prev) => ({ ...prev, lines: event.target.value }))
                  }
                  placeholder="One Hour: $125\nHalf Hour: $65"
                />
              </Field>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeRateModal}>
              Cancel
            </Button>
            <Button color="red" onClick={saveRateDraft}>
              {rateEditingIndex === null ? "Add Rate" : "Save Rate"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}
