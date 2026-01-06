"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import type { DocumentData } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import {
  LEGACY_LESSONS_CONTENT,
  type LessonsContent,
  type LessonsFeaturedPro,
  type LessonsAdditionalPro,
  type LessonsRate,
  type LessonsCoachProgram,
  type LessonsTechnologyLink,
} from "@/data/lessonsContent";

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const normalizeStringArray = (value: unknown) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return list
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
};

const normalizeFeaturedPro = (value: unknown): LessonsFeaturedPro | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  const role = asString(record.role).trim();
  const bio = asString(record.bio).trim();
  if (!name || !role || !bio) return null;
  const phone = asString(record.phone).trim();
  const email = asString(record.email).trim();
  const image = asString(record.image).trim();
  return {
    name,
    role,
    bio,
    phone: phone || undefined,
    email: email || undefined,
    image: image || undefined,
  };
};

const normalizeAdditionalPro = (value: unknown): LessonsAdditionalPro | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  if (!name) return null;
  const description = asString(record.description).trim();
  return {
    name,
    description: description || undefined,
  };
};

const normalizeRate = (value: unknown): LessonsRate | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title).trim();
  if (!title) return null;
  const details = normalizeStringArray(record.details);
  return { title, details };
};

const isRate = (value: LessonsRate | null): value is LessonsRate => value !== null;

const normalizeProgram = (value: unknown): LessonsCoachProgram | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title).trim();
  const description = asString(record.description).trim();
  const cost = asString(record.cost).trim();
  const sessions = normalizeStringArray(record.sessions);
  if (!title || !description) return null;
  return {
    title,
    description,
    cost: cost || "",
    sessions,
  };
};

const normalizeTechLink = (value: unknown): LessonsTechnologyLink | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const label = asString(record.label).trim();
  const href = asString(record.href).trim();
  if (!label || !href) return null;
  return { label, href };
};

const isTechLink = (value: LessonsTechnologyLink | null): value is LessonsTechnologyLink =>
  value !== null;

export function useLessonsConfig(firebase: Firebase | null) {
  const [config, setConfig] = useState<LessonsContent>(LEGACY_LESSONS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.lessonsConfigRef(),
      (snapshot) => {
        const data = (snapshot.data() as DocumentData | undefined) ?? {};

        const hero = {
          title: asString(data.heroTitle).trim() || LEGACY_LESSONS_CONTENT.hero.title,
          subtitle: asString(data.heroSubtitle).trim() || LEGACY_LESSONS_CONTENT.hero.subtitle,
          description:
            asString(data.heroDescription).trim() ||
            LEGACY_LESSONS_CONTENT.hero.description,
        };

        const intro = {
          eyebrow: asString(data.introEyebrow).trim() || LEGACY_LESSONS_CONTENT.intro.eyebrow,
          title: asString(data.introTitle).trim() || LEGACY_LESSONS_CONTENT.intro.title,
          description:
            asString(data.introDescription).trim() ||
            LEGACY_LESSONS_CONTENT.intro.description,
        };

        const featuredPros = Array.isArray(data.featuredPros)
          ? data.featuredPros.map(normalizeFeaturedPro).filter(Boolean)
          : [];

        const additionalPros = Array.isArray(data.additionalPros)
          ? data.additionalPros.map(normalizeAdditionalPro).filter(Boolean)
          : [];

        const meetThePros = {
          title: asString(data.meetTheProsTitle).trim() || LEGACY_LESSONS_CONTENT.meetThePros.title,
          description:
            asString(data.meetTheProsDescription).trim() ||
            LEGACY_LESSONS_CONTENT.meetThePros.description,
        };

        const cta = {
          title: asString(data.ctaTitle).trim() || LEGACY_LESSONS_CONTENT.cta.title,
          description:
            asString(data.ctaDescription).trim() ||
            LEGACY_LESSONS_CONTENT.cta.description,
          buttonLabel:
            asString(data.ctaButtonLabel).trim() ||
            LEGACY_LESSONS_CONTENT.cta.buttonLabel,
        };

        const rates = {
          title: asString(data.ratesTitle).trim() || LEGACY_LESSONS_CONTENT.rates.title,
          description:
            asString(data.ratesDescription).trim() ||
            LEGACY_LESSONS_CONTENT.rates.description,
          items: Array.isArray(data.rates)
            ? data.rates.map(normalizeRate).filter(isRate)
            : [],
        };

        const coachPrograms = Array.isArray(data.coachPrograms)
          ? data.coachPrograms.map(normalizeProgram).filter(Boolean)
          : [];

        const form = {
          eyebrow: asString(data.formEyebrow).trim() || LEGACY_LESSONS_CONTENT.form.eyebrow,
          title: asString(data.formTitle).trim() || LEGACY_LESSONS_CONTENT.form.title,
          description:
            asString(data.formDescription).trim() ||
            LEGACY_LESSONS_CONTENT.form.description,
          submitLabel:
            asString(data.formSubmitLabel).trim() ||
            LEGACY_LESSONS_CONTENT.form.submitLabel,
          successTitle:
            asString(data.formSuccessTitle).trim() ||
            LEGACY_LESSONS_CONTENT.form.successTitle,
          successMessage:
            asString(data.formSuccessMessage).trim() ||
            LEGACY_LESSONS_CONTENT.form.successMessage,
          sentToLabel:
            asString(data.formSentToLabel).trim() ||
            LEGACY_LESSONS_CONTENT.form.sentToLabel,
        };

        const technology = {
          title:
            asString(data.technologyTitle).trim() ||
            LEGACY_LESSONS_CONTENT.technology.title,
          description:
            asString(data.technologyDescription).trim() ||
            LEGACY_LESSONS_CONTENT.technology.description,
          links: Array.isArray(data.technologyLinks)
            ? data.technologyLinks.map(normalizeTechLink).filter(isTechLink)
            : [],
        };

        const selectOptions = {
          locations:
            normalizeStringArray(data.locations).length > 0
              ? normalizeStringArray(data.locations)
              : LEGACY_LESSONS_CONTENT.selectOptions.locations,
          timesOfDay:
            normalizeStringArray(data.timesOfDay).length > 0
              ? normalizeStringArray(data.timesOfDay)
              : LEGACY_LESSONS_CONTENT.selectOptions.timesOfDay,
        };

        setConfig({
          hero,
          intro,
          featuredPros: featuredPros as LessonsFeaturedPro[],
          meetThePros,
          additionalPros: additionalPros as LessonsAdditionalPro[],
          cta,
          rates,
          coachPrograms: coachPrograms as LessonsCoachProgram[],
          form,
          technology,
          selectOptions,
        });

        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useLessonsConfig] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setConfig(LEGACY_LESSONS_CONTENT);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  return useMemo(() => ({ config, loading, error }), [config, loading, error]);
}
