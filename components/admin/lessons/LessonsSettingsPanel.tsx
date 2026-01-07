"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { Field, FormCard, TextInput, Textarea } from "@/components/ui/Form";
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
import { LEGACY_LESSONS_CONTENT } from "@/data/lessonsContent";

type FeaturedProForm = {
  id: string;
  name: string;
  role: string;
  bio: string;
  phone: string;
  email: string;
  image: string;
};

type AdditionalProForm = {
  id: string;
  name: string;
  description: string;
  phone: string;
  email: string;
};

type RateForm = {
  id: string;
  title: string;
  details: string;
};

type CoachProgramForm = {
  id: string;
  title: string;
  description: string;
  sessions: string;
  cost: string;
};

type TechLinkForm = {
  id: string;
  label: string;
  href: string;
};

type LessonsConfigForm = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  meetTheProsTitle: string;
  meetTheProsDescription: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonLabel: string;
  ratesTitle: string;
  ratesDescription: string;
  formEyebrow: string;
  formTitle: string;
  formDescription: string;
  formSubmitLabel: string;
  formSuccessTitle: string;
  formSuccessMessage: string;
  formSentToLabel: string;
  technologyTitle: string;
  technologyDescription: string;
  locations: string;
  timesOfDay: string;
  featuredPros: FeaturedProForm[];
  additionalPros: AdditionalProForm[];
  rates: RateForm[];
  coachPrograms: CoachProgramForm[];
  technologyLinks: TechLinkForm[];
};

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

const normalizeLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const cloneState = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const DEFAULT_STATE: LessonsConfigForm = {
  heroTitle: LEGACY_LESSONS_CONTENT.hero.title,
  heroSubtitle: LEGACY_LESSONS_CONTENT.hero.subtitle,
  heroDescription: LEGACY_LESSONS_CONTENT.hero.description,
  introEyebrow: LEGACY_LESSONS_CONTENT.intro.eyebrow,
  introTitle: LEGACY_LESSONS_CONTENT.intro.title,
  introDescription: LEGACY_LESSONS_CONTENT.intro.description,
  meetTheProsTitle: LEGACY_LESSONS_CONTENT.meetThePros.title,
  meetTheProsDescription: LEGACY_LESSONS_CONTENT.meetThePros.description,
  ctaTitle: LEGACY_LESSONS_CONTENT.cta.title,
  ctaDescription: LEGACY_LESSONS_CONTENT.cta.description,
  ctaButtonLabel: LEGACY_LESSONS_CONTENT.cta.buttonLabel,
  ratesTitle: LEGACY_LESSONS_CONTENT.rates.title,
  ratesDescription: LEGACY_LESSONS_CONTENT.rates.description,
  formEyebrow: LEGACY_LESSONS_CONTENT.form.eyebrow,
  formTitle: LEGACY_LESSONS_CONTENT.form.title,
  formDescription: LEGACY_LESSONS_CONTENT.form.description,
  formSubmitLabel: LEGACY_LESSONS_CONTENT.form.submitLabel,
  formSuccessTitle: LEGACY_LESSONS_CONTENT.form.successTitle,
  formSuccessMessage: LEGACY_LESSONS_CONTENT.form.successMessage,
  formSentToLabel: LEGACY_LESSONS_CONTENT.form.sentToLabel,
  technologyTitle: LEGACY_LESSONS_CONTENT.technology.title,
  technologyDescription: LEGACY_LESSONS_CONTENT.technology.description,
  locations: LEGACY_LESSONS_CONTENT.selectOptions.locations.join("\n"),
  timesOfDay: LEGACY_LESSONS_CONTENT.selectOptions.timesOfDay.join("\n"),
  featuredPros: LEGACY_LESSONS_CONTENT.featuredPros.map((pro) => ({
    id: createId("featured"),
    name: pro.name,
    role: pro.role,
    bio: pro.bio,
    phone: pro.phone ?? "",
    email: pro.email ?? "",
    image: pro.image ?? "",
  })),
  additionalPros: LEGACY_LESSONS_CONTENT.additionalPros.map((pro) => ({
    id: createId("additional"),
    name: pro.name,
    description: pro.description ?? "",
    phone: pro.phone ?? "",
    email: pro.email ?? "",
  })),
  rates: LEGACY_LESSONS_CONTENT.rates.items.map((rate) => ({
    id: createId("rate"),
    title: rate.title,
    details: rate.details.join("\n"),
  })),
  coachPrograms: LEGACY_LESSONS_CONTENT.coachPrograms.map((program) => ({
    id: createId("program"),
    title: program.title,
    description: program.description,
    sessions: program.sessions.join("\n"),
    cost: program.cost,
  })),
  technologyLinks: LEGACY_LESSONS_CONTENT.technology.links.map((link) => ({
    id: createId("tech"),
    label: link.label,
    href: link.href,
  })),
};

type LessonsSettingsPanelProps = {
  firebase: Firebase;
};

export function LessonsSettingsPanel({ firebase }: LessonsSettingsPanelProps) {
  const [form, setForm] = useState<LessonsConfigForm>(cloneState(DEFAULT_STATE));
  const [initial, setInitial] = useState<LessonsConfigForm>(cloneState(DEFAULT_STATE));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const [featuredEditingIndex, setFeaturedEditingIndex] = useState<number | null>(null);
  const [featuredDraft, setFeaturedDraft] = useState<FeaturedProForm>({
    id: createId("featured"),
    name: "",
    role: "",
    bio: "",
    phone: "",
    email: "",
    image: "",
  });
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredUploadError, setFeaturedUploadError] = useState<string | null>(null);

  const [additionalModalOpen, setAdditionalModalOpen] = useState(false);
  const [additionalEditingIndex, setAdditionalEditingIndex] = useState<number | null>(null);
  const [additionalDraft, setAdditionalDraft] = useState<AdditionalProForm>({
    id: createId("additional"),
    name: "",
    description: "",
    phone: "",
    email: "",
  });

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateEditingIndex, setRateEditingIndex] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState<RateForm>({
    id: createId("rate"),
    title: "",
    details: "",
  });

  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programEditingIndex, setProgramEditingIndex] = useState<number | null>(null);
  const [programDraft, setProgramDraft] = useState<CoachProgramForm>({
    id: createId("program"),
    title: "",
    description: "",
    sessions: "",
    cost: "",
  });

  const [techModalOpen, setTechModalOpen] = useState(false);
  const [techEditingIndex, setTechEditingIndex] = useState<number | null>(null);
  const [techDraft, setTechDraft] = useState<TechLinkForm>({
    id: createId("tech"),
    label: "",
    href: "",
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    setStatus("idle");

    const unsubscribe = onSnapshot(
      firebase.lessonsConfigRef(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const next: LessonsConfigForm = {
          heroTitle: typeof data?.heroTitle === "string" ? data.heroTitle : DEFAULT_STATE.heroTitle,
          heroSubtitle: typeof data?.heroSubtitle === "string" ? data.heroSubtitle : DEFAULT_STATE.heroSubtitle,
          heroDescription:
            typeof data?.heroDescription === "string"
              ? data.heroDescription
              : DEFAULT_STATE.heroDescription,
          introEyebrow:
            typeof data?.introEyebrow === "string"
              ? data.introEyebrow
              : DEFAULT_STATE.introEyebrow,
          introTitle:
            typeof data?.introTitle === "string" ? data.introTitle : DEFAULT_STATE.introTitle,
          introDescription:
            typeof data?.introDescription === "string"
              ? data.introDescription
              : DEFAULT_STATE.introDescription,
          meetTheProsTitle:
            typeof data?.meetTheProsTitle === "string"
              ? data.meetTheProsTitle
              : DEFAULT_STATE.meetTheProsTitle,
          meetTheProsDescription:
            typeof data?.meetTheProsDescription === "string"
              ? data.meetTheProsDescription
              : DEFAULT_STATE.meetTheProsDescription,
          ctaTitle: typeof data?.ctaTitle === "string" ? data.ctaTitle : DEFAULT_STATE.ctaTitle,
          ctaDescription:
            typeof data?.ctaDescription === "string"
              ? data.ctaDescription
              : DEFAULT_STATE.ctaDescription,
          ctaButtonLabel:
            typeof data?.ctaButtonLabel === "string"
              ? data.ctaButtonLabel
              : DEFAULT_STATE.ctaButtonLabel,
          ratesTitle:
            typeof data?.ratesTitle === "string" ? data.ratesTitle : DEFAULT_STATE.ratesTitle,
          ratesDescription:
            typeof data?.ratesDescription === "string"
              ? data.ratesDescription
              : DEFAULT_STATE.ratesDescription,
          formEyebrow:
            typeof data?.formEyebrow === "string" ? data.formEyebrow : DEFAULT_STATE.formEyebrow,
          formTitle:
            typeof data?.formTitle === "string" ? data.formTitle : DEFAULT_STATE.formTitle,
          formDescription:
            typeof data?.formDescription === "string"
              ? data.formDescription
              : DEFAULT_STATE.formDescription,
          formSubmitLabel:
            typeof data?.formSubmitLabel === "string"
              ? data.formSubmitLabel
              : DEFAULT_STATE.formSubmitLabel,
          formSuccessTitle:
            typeof data?.formSuccessTitle === "string"
              ? data.formSuccessTitle
              : DEFAULT_STATE.formSuccessTitle,
          formSuccessMessage:
            typeof data?.formSuccessMessage === "string"
              ? data.formSuccessMessage
              : DEFAULT_STATE.formSuccessMessage,
          formSentToLabel:
            typeof data?.formSentToLabel === "string"
              ? data.formSentToLabel
              : DEFAULT_STATE.formSentToLabel,
          technologyTitle:
            typeof data?.technologyTitle === "string"
              ? data.technologyTitle
              : DEFAULT_STATE.technologyTitle,
          technologyDescription:
            typeof data?.technologyDescription === "string"
              ? data.technologyDescription
              : DEFAULT_STATE.technologyDescription,
          locations: Array.isArray(data?.locations)
            ? data.locations.join("\n")
            : typeof data?.locations === "string"
              ? data.locations
              : DEFAULT_STATE.locations,
          timesOfDay: Array.isArray(data?.timesOfDay)
            ? data.timesOfDay.join("\n")
            : typeof data?.timesOfDay === "string"
              ? data.timesOfDay
              : DEFAULT_STATE.timesOfDay,
          featuredPros: Array.isArray(data?.featuredPros)
            ? data.featuredPros.map((entry: unknown) => {
                const record = entry as Record<string, unknown>;
                return {
                  id: createId("featured"),
                  name: typeof record?.name === "string" ? record.name : "",
                  role: typeof record?.role === "string" ? record.role : "",
                  bio: typeof record?.bio === "string" ? record.bio : "",
                  phone: typeof record?.phone === "string" ? record.phone : "",
                  email: typeof record?.email === "string" ? record.email : "",
                  image: typeof record?.image === "string" ? record.image : "",
                };
              })
            : cloneState(DEFAULT_STATE.featuredPros),
          additionalPros: Array.isArray(data?.additionalPros)
            ? data.additionalPros.map((entry: unknown) => {
                const record = entry as Record<string, unknown>;
                return {
                  id: createId("additional"),
                  name: typeof record?.name === "string" ? record.name : "",
                  description: typeof record?.description === "string" ? record.description : "",
                  phone: typeof record?.phone === "string" ? record.phone : "",
                  email: typeof record?.email === "string" ? record.email : "",
                };
              })
            : cloneState(DEFAULT_STATE.additionalPros),
          rates: Array.isArray(data?.rates)
            ? data.rates.map((entry: unknown) => {
                const record = entry as Record<string, unknown>;
                return {
                  id: createId("rate"),
                  title: typeof record?.title === "string" ? record.title : "",
                  details: Array.isArray(record?.details)
                    ? record.details.join("\n")
                    : typeof record?.details === "string"
                      ? record.details
                      : "",
                };
              })
            : cloneState(DEFAULT_STATE.rates),
          coachPrograms: Array.isArray(data?.coachPrograms)
            ? data.coachPrograms.map((entry: unknown) => {
                const record = entry as Record<string, unknown>;
                return {
                  id: createId("program"),
                  title: typeof record?.title === "string" ? record.title : "",
                  description: typeof record?.description === "string" ? record.description : "",
                  sessions: Array.isArray(record?.sessions)
                    ? record.sessions.join("\n")
                    : typeof record?.sessions === "string"
                      ? record.sessions
                      : "",
                  cost: typeof record?.cost === "string" ? record.cost : "",
                };
              })
            : cloneState(DEFAULT_STATE.coachPrograms),
          technologyLinks: Array.isArray(data?.technologyLinks)
            ? data.technologyLinks.map((entry: unknown) => {
                const record = entry as Record<string, unknown>;
                return {
                  id: createId("tech"),
                  label: typeof record?.label === "string" ? record.label : "",
                  href: typeof record?.href === "string" ? record.href : "",
                };
              })
            : cloneState(DEFAULT_STATE.technologyLinks),
        };

        setForm(cloneState(next));
        setInitial(cloneState(next));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[LessonsSettings] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const openFeaturedModal = (index: number | null) => {
    if (index === null) {
      setFeaturedDraft({
        id: createId("featured"),
        name: "",
        role: "",
        bio: "",
        phone: "",
        email: "",
        image: "",
      });
      setFeaturedEditingIndex(null);
    } else {
      setFeaturedDraft({ ...form.featuredPros[index] });
      setFeaturedEditingIndex(index);
    }
    setFeaturedModalOpen(true);
    setFeaturedUploadError(null);
  };

  const closeFeaturedModal = () => {
    setFeaturedModalOpen(false);
    setFeaturedEditingIndex(null);
    setFeaturedUploadError(null);
  };

  const saveFeaturedDraft = () => {
    const nextForm: LessonsConfigForm = {
      ...form,
      featuredPros: (() => {
        const next = [...form.featuredPros];
        if (featuredEditingIndex === null) {
          next.push(featuredDraft);
        } else {
          next[featuredEditingIndex] = featuredDraft;
        }
        return next;
      })(),
    };
    setForm(nextForm);
    closeFeaturedModal();
    void handleSave(nextForm);
  };

  const handleFeaturedImageUpload = async (file: File) => {
    const safeName = file.name.replace(/[^\w.\-()]+/g, "_");
    const storagePath = `thebunker/lessons/headshots/${Date.now()}_${safeName}`;
    const objectRef = storageRef(firebase.storage, storagePath);
    setFeaturedUploading(true);
    setFeaturedUploadError(null);

    try {
      await uploadBytes(objectRef, file, { contentType: file.type });
      const url = await getDownloadURL(objectRef);
      setFeaturedDraft((prev) => ({ ...prev, image: url }));
    } catch (error) {
      console.error("[LessonsSettings] headshot upload failed", error);
      setFeaturedUploadError("Upload failed. Please try again.");
    } finally {
      setFeaturedUploading(false);
    }
  };

  const openAdditionalModal = (index: number | null) => {
    if (index === null) {
      setAdditionalDraft({
        id: createId("additional"),
        name: "",
        description: "",
        phone: "",
        email: "",
      });
      setAdditionalEditingIndex(null);
    } else {
      setAdditionalDraft({ ...form.additionalPros[index] });
      setAdditionalEditingIndex(index);
    }
    setAdditionalModalOpen(true);
  };

  const closeAdditionalModal = () => {
    setAdditionalModalOpen(false);
    setAdditionalEditingIndex(null);
  };

  const saveAdditionalDraft = () => {
    setForm((prev) => {
      const next = [...prev.additionalPros];
      if (additionalEditingIndex === null) {
        next.push(additionalDraft);
      } else {
        next[additionalEditingIndex] = additionalDraft;
      }
      return { ...prev, additionalPros: next };
    });
    closeAdditionalModal();
  };

  const openRateModal = (index: number | null) => {
    if (index === null) {
      setRateDraft({ id: createId("rate"), title: "", details: "" });
      setRateEditingIndex(null);
    } else {
      setRateDraft({ ...form.rates[index] });
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
      const next = [...prev.rates];
      if (rateEditingIndex === null) {
        next.push(rateDraft);
      } else {
        next[rateEditingIndex] = rateDraft;
      }
      return { ...prev, rates: next };
    });
    closeRateModal();
  };

  const openProgramModal = (index: number | null) => {
    if (index === null) {
      setProgramDraft({
        id: createId("program"),
        title: "",
        description: "",
        sessions: "",
        cost: "",
      });
      setProgramEditingIndex(null);
    } else {
      setProgramDraft({ ...form.coachPrograms[index] });
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
      const next = [...prev.coachPrograms];
      if (programEditingIndex === null) {
        next.push(programDraft);
      } else {
        next[programEditingIndex] = programDraft;
      }
      return { ...prev, coachPrograms: next };
    });
    closeProgramModal();
  };

  const openTechModal = (index: number | null) => {
    if (index === null) {
      setTechDraft({ id: createId("tech"), label: "", href: "" });
      setTechEditingIndex(null);
    } else {
      setTechDraft({ ...form.technologyLinks[index] });
      setTechEditingIndex(index);
    }
    setTechModalOpen(true);
  };

  const closeTechModal = () => {
    setTechModalOpen(false);
    setTechEditingIndex(null);
  };

  const saveTechDraft = () => {
    setForm((prev) => {
      const next = [...prev.technologyLinks];
      if (techEditingIndex === null) {
        next.push(techDraft);
      } else {
        next[techEditingIndex] = techDraft;
      }
      return { ...prev, technologyLinks: next };
    });
    closeTechModal();
  };

  const handleSave = useCallback(async (override?: LessonsConfigForm) => {
    setSaving(true);
    setError(null);
    setStatus("idle");

    try {
      const source = override ?? form;
      const payload = {
        heroTitle: source.heroTitle.trim() || DEFAULT_STATE.heroTitle,
        heroSubtitle: source.heroSubtitle.trim() || null,
        heroDescription: source.heroDescription.trim() || null,
        introEyebrow: source.introEyebrow.trim() || null,
        introTitle: source.introTitle.trim() || null,
        introDescription: source.introDescription.trim() || null,
        meetTheProsTitle: source.meetTheProsTitle.trim() || null,
        meetTheProsDescription: source.meetTheProsDescription.trim() || null,
        ctaTitle: source.ctaTitle.trim() || null,
        ctaDescription: source.ctaDescription.trim() || null,
        ctaButtonLabel: source.ctaButtonLabel.trim() || null,
        ratesTitle: source.ratesTitle.trim() || null,
        ratesDescription: source.ratesDescription.trim() || null,
        formEyebrow: source.formEyebrow.trim() || null,
        formTitle: source.formTitle.trim() || null,
        formDescription: source.formDescription.trim() || null,
        formSubmitLabel: source.formSubmitLabel.trim() || null,
        formSuccessTitle: source.formSuccessTitle.trim() || null,
        formSuccessMessage: source.formSuccessMessage.trim() || null,
        formSentToLabel: source.formSentToLabel.trim() || null,
        technologyTitle: source.technologyTitle.trim() || null,
        technologyDescription: source.technologyDescription.trim() || null,
        locations: normalizeLines(source.locations),
        timesOfDay: normalizeLines(source.timesOfDay),
        featuredPros: source.featuredPros
          .map((pro) => ({
            name: pro.name.trim(),
            role: pro.role.trim(),
            bio: pro.bio.trim(),
            phone: pro.phone.trim() || null,
            email: pro.email.trim() || null,
            image: pro.image.trim() || null,
          }))
          .filter((pro) => pro.name && pro.role && pro.bio),
        additionalPros: source.additionalPros
          .map((pro) => ({
            name: pro.name.trim(),
            description: pro.description.trim() || null,
            phone: pro.phone.trim() || null,
            email: pro.email.trim() || null,
          }))
          .filter((pro) => pro.name),
        rates: source.rates
          .map((rate) => ({
            title: rate.title.trim(),
            details: normalizeLines(rate.details),
          }))
          .filter((rate) => rate.title && rate.details.length),
        coachPrograms: source.coachPrograms
          .map((program) => ({
            title: program.title.trim(),
            description: program.description.trim(),
            sessions: normalizeLines(program.sessions),
            cost: program.cost.trim() || null,
          }))
          .filter((program) => program.title && program.description),
        technologyLinks: source.technologyLinks
          .map((link) => ({
            label: link.label.trim(),
            href: link.href.trim(),
          }))
          .filter((link) => link.label && link.href),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(firebase.lessonsConfigRef(), payload, { merge: true });
      setStatus("success");
    } catch (err: unknown) {
      console.error("[LessonsSettings] save failed", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [form]);

  useEffect(() => {
    if (status === "success") {
      toast.success("Lessons settings saved.");
    } else if (status === "error" && error) {
      toast.error(error.message);
    }
  }, [status, error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Lessons Page
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Manage hero content, instructor profiles, rates, and page copy shown on the public lessons page.
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

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero Title" required className="md:col-span-2">
            <TextInput
              value={form.heroTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, heroTitle: event.target.value }))}
              required
              disabled={loading}
            />
          </Field>
          <Field label="Hero Subtitle" className="md:col-span-2">
            <TextInput
              value={form.heroSubtitle}
              onChange={(event) => setForm((prev) => ({ ...prev, heroSubtitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Hero Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.heroDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, heroDescription: event.target.value }))}
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Intro Eyebrow">
            <TextInput
              value={form.introEyebrow}
              onChange={(event) => setForm((prev) => ({ ...prev, introEyebrow: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Intro Title">
            <TextInput
              value={form.introTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, introTitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Intro Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.introDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, introDescription: event.target.value }))}
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Featured Pros
          </h3>
          <Button outline onClick={() => openFeaturedModal(null)}>
            Add Pro
          </Button>
        </div>
        <div className="mt-6">
          {form.featuredPros.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Pro</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Contact</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.featuredPros.map((pro, index) => (
                    <TableRow key={pro.id}>
                      <TableCell className="text-white">
                        {pro.name || `Pro ${index + 1}`}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {pro.role || "—"}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {pro.email || pro.phone ? (
                          <span>
                            {pro.email || "—"}
                            {pro.phone ? ` • ${pro.phone}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openFeaturedModal(index)}>
                            Edit
                          </Button>
                          <Button
                            color="red"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                featuredPros: prev.featuredPros.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center">
              <Text className="text-sm text-white/60">No featured pros configured.</Text>
            </div>
          )}
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Meet the Pros Title">
            <TextInput
              value={form.meetTheProsTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, meetTheProsTitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Meet the Pros Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.meetTheProsDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, meetTheProsDescription: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Additional Pros
          </h3>
          <Button outline onClick={() => openAdditionalModal(null)}>
            Add Pro
          </Button>
        </div>
        <div className="mt-6">
          {form.additionalPros.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Pro</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Contact</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.additionalPros.map((pro, index) => (
                    <TableRow key={pro.id}>
                      <TableCell className="text-white">
                        {pro.name || `Pro ${index + 1}`}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-white/70">
                        {pro.description || "—"}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {pro.email || pro.phone ? (
                          <span>
                            {pro.email || "—"}
                            {pro.phone ? ` • ${pro.phone}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openAdditionalModal(index)}>
                            Edit
                          </Button>
                          <Button
                            color="red"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                additionalPros: prev.additionalPros.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center">
              <Text className="text-sm text-white/60">No additional pros configured.</Text>
            </div>
          )}
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CTA Title">
            <TextInput
              value={form.ctaTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, ctaTitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="CTA Button Label">
            <TextInput
              value={form.ctaButtonLabel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ctaButtonLabel: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="CTA Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.ctaDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ctaDescription: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Rates Title">
            <TextInput
              value={form.ratesTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, ratesTitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Rates Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.ratesDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ratesDescription: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Rate Cards
          </h3>
          <Button outline onClick={() => openRateModal(null)}>
            Add Rate
          </Button>
        </div>
        <div className="mt-4">
          {form.rates.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Rate</TableHeader>
                    <TableHeader>Details</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.rates.map((rate, index) => (
                    <TableRow key={rate.id}>
                      <TableCell className="text-white">
                        {rate.title || `Rate ${index + 1}`}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-white/70">
                        {normalizeLines(rate.details)[0] || "—"}
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
                                rates: prev.rates.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Coach Programs
          </h3>
          <Button outline onClick={() => openProgramModal(null)}>
            Add Program
          </Button>
        </div>
        <div className="mt-6">
          {form.coachPrograms.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Program</TableHeader>
                    <TableHeader>Cost</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.coachPrograms.map((program, index) => (
                    <TableRow key={program.id}>
                      <TableCell className="text-white">
                        {program.title || `Program ${index + 1}`}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {program.cost || "—"}
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
                                coachPrograms: prev.coachPrograms.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Form Eyebrow">
            <TextInput
              value={form.formEyebrow}
              onChange={(event) => setForm((prev) => ({ ...prev, formEyebrow: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Form Title">
            <TextInput
              value={form.formTitle}
              onChange={(event) => setForm((prev) => ({ ...prev, formTitle: event.target.value }))}
              disabled={loading}
            />
          </Field>
          <Field label="Form Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.formDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, formDescription: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="Form Submit Label">
            <TextInput
              value={form.formSubmitLabel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, formSubmitLabel: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="Sent To Label">
            <TextInput
              value={form.formSentToLabel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, formSentToLabel: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="Success Title" className="md:col-span-2">
            <TextInput
              value={form.formSuccessTitle}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, formSuccessTitle: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="Success Message" className="md:col-span-2">
            <Textarea
              rows={2}
              value={form.formSuccessMessage}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, formSuccessMessage: event.target.value }))
              }
              disabled={loading}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Location Options (one per line)">
            <Textarea
              rows={6}
              value={form.locations}
              onChange={(event) => setForm((prev) => ({ ...prev, locations: event.target.value }))}
            />
          </Field>
          <Field label="Time of Day Options (one per line)">
            <Textarea
              rows={6}
              value={form.timesOfDay}
              onChange={(event) => setForm((prev) => ({ ...prev, timesOfDay: event.target.value }))}
            />
          </Field>
        </div>
      </FormCard>

      <FormCard>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Technology Section Title">
            <TextInput
              value={form.technologyTitle}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, technologyTitle: event.target.value }))
              }
            />
          </Field>
          <Field label="Technology Section Description" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.technologyDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, technologyDescription: event.target.value }))
              }
            />
          </Field>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Technology Links
          </h3>
          <Button outline onClick={() => openTechModal(null)}>
            Add Link
          </Button>
        </div>
        <div className="mt-4">
          {form.technologyLinks.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>URL</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.technologyLinks.map((link, index) => (
                    <TableRow key={link.id}>
                      <TableCell className="text-white">{link.label || `Link ${index + 1}`}</TableCell>
                      <TableCell className="text-white/70">
                        {link.href ? (
                          <TextLink href={link.href} target="_blank" rel="noopener noreferrer">
                            {link.href}
                          </TextLink>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openTechModal(index)}>
                            Edit
                          </Button>
                          <Button
                            color="red"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                technologyLinks: prev.technologyLinks.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-10 text-center">
              <Text className="text-sm text-white/60">No technology links configured.</Text>
            </div>
          )}
        </div>
      </FormCard>

      {featuredModalOpen ? (
        <Dialog open={featuredModalOpen} onClose={closeFeaturedModal}>
          <DialogTitle>
            {featuredEditingIndex === null ? "Add Featured Pro" : "Edit Featured Pro"}
          </DialogTitle>
          <DialogDescription>
            Update the featured instructor details and headshot.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" required className="md:col-span-2">
                <TextInput
                  value={featuredDraft.name}
                  onChange={(event) =>
                    setFeaturedDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Role" required className="md:col-span-2">
                <TextInput
                  value={featuredDraft.role}
                  onChange={(event) =>
                    setFeaturedDraft((prev) => ({ ...prev, role: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Bio" className="md:col-span-2">
                <Textarea
                  rows={4}
                  value={featuredDraft.bio}
                  onChange={(event) =>
                    setFeaturedDraft((prev) => ({ ...prev, bio: event.target.value }))
                  }
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  value={featuredDraft.phone}
                  onChange={(event) =>
                    setFeaturedDraft((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={featuredDraft.email}
                  onChange={(event) =>
                    setFeaturedDraft((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Headshot" className="md:col-span-2">
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFeaturedImageUpload(file);
                      }
                      event.currentTarget.value = "";
                    }}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-white hover:file:bg-white/20"
                    disabled={featuredUploading}
                  />
                  {featuredUploading ? (
                    <Text className="text-xs text-white/60">Uploading headshot…</Text>
                  ) : null}
                  {featuredUploadError ? (
                    <Text className="text-xs text-red-200">{featuredUploadError}</Text>
                  ) : null}
                  {featuredDraft.image ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
                      <TextLink href={featuredDraft.image} target="_blank" rel="noreferrer">
                        View current headshot
                      </TextLink>
                      <Button
                        outline
                        onClick={() => setFeaturedDraft((prev) => ({ ...prev, image: "" }))}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Text className="text-xs text-white/60">Upload a square image (JPG/PNG).</Text>
                  )}
                </div>
              </Field>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeFeaturedModal}>
              Cancel
            </Button>
            <Button color="red" onClick={saveFeaturedDraft}>
              {featuredEditingIndex === null ? "Add Pro" : "Save Pro"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {additionalModalOpen ? (
        <Dialog open={additionalModalOpen} onClose={closeAdditionalModal}>
          <DialogTitle>
            {additionalEditingIndex === null ? "Add Additional Pro" : "Edit Additional Pro"}
          </DialogTitle>
          <DialogDescription>
            Update the supporting instructor details.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" required className="md:col-span-2">
                <TextInput
                  value={additionalDraft.name}
                  onChange={(event) =>
                    setAdditionalDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={additionalDraft.description}
                  onChange={(event) =>
                    setAdditionalDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  value={additionalDraft.phone}
                  onChange={(event) =>
                    setAdditionalDraft((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={additionalDraft.email}
                  onChange={(event) =>
                    setAdditionalDraft((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </Field>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeAdditionalModal}>
              Cancel
            </Button>
            <Button color="red" onClick={saveAdditionalDraft}>
              {additionalEditingIndex === null ? "Add Pro" : "Save Pro"}
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
            Update the rate details shown on the lessons page.
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
              <Field label="Details (one per line)">
                <Textarea
                  rows={4}
                  value={rateDraft.details}
                  onChange={(event) =>
                    setRateDraft((prev) => ({ ...prev, details: event.target.value }))
                  }
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

      {programModalOpen ? (
        <Dialog open={programModalOpen} onClose={closeProgramModal}>
          <DialogTitle>
            {programEditingIndex === null ? "Add Program" : "Edit Program"}
          </DialogTitle>
          <DialogDescription>
            Update the coaching program details and sessions.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4">
              <Field label="Title" required>
                <TextInput
                  value={programDraft.title}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={programDraft.description}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </Field>
              <Field label="Sessions (one per line)">
                <Textarea
                  rows={4}
                  value={programDraft.sessions}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({ ...prev, sessions: event.target.value }))
                  }
                />
              </Field>
              <Field label="Cost">
                <TextInput
                  value={programDraft.cost}
                  onChange={(event) =>
                    setProgramDraft((prev) => ({ ...prev, cost: event.target.value }))
                  }
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

      {techModalOpen ? (
        <Dialog open={techModalOpen} onClose={closeTechModal}>
          <DialogTitle>
            {techEditingIndex === null ? "Add Technology Link" : "Edit Technology Link"}
          </DialogTitle>
          <DialogDescription>
            Provide the label and URL for this technology partner.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4">
              <Field label="Label" required>
                <TextInput
                  value={techDraft.label}
                  onChange={(event) =>
                    setTechDraft((prev) => ({ ...prev, label: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="URL" required>
                <TextInput
                  type="url"
                  inputMode="url"
                  value={techDraft.href}
                  onChange={(event) =>
                    setTechDraft((prev) => ({ ...prev, href: event.target.value }))
                  }
                  required
                />
              </Field>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeTechModal}>
              Cancel
            </Button>
            <Button color="red" onClick={saveTechDraft}>
              {techEditingIndex === null ? "Add Link" : "Save Link"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}
