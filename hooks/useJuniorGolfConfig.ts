"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData } from "firebase/firestore";

export type JuniorGolfProgram = {
  title: string;
  description?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

export type JuniorGolfLessonRate = {
  title: string;
  lines: string[];
};

export type JuniorGolfConfig = {
  heroTitle: string;
  heroSubtitle?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
  programs: JuniorGolfProgram[];
  lessonRates: JuniorGolfLessonRate[];
};

const DEFAULT_CONFIG: JuniorGolfConfig = {
  heroTitle: "Junior Golf",
  heroSubtitle: null,
  heroDescription: null,
  heroImageUrl: null,
  programs: [],
  lessonRates: [],
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeProgram(value: unknown): JuniorGolfProgram | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title).trim();
  if (!title) return null;
  const description = asString(record.description).trim();
  const ctaLabel = asString(record.ctaLabel).trim();
  const ctaUrl = asString(record.ctaUrl).trim();
  return {
    title,
    description: description || null,
    ctaLabel: ctaLabel || null,
    ctaUrl: ctaUrl || null,
  };
}

function normalizeRate(value: unknown): JuniorGolfLessonRate | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title).trim();
  if (!title) return null;
  const rawLines = Array.isArray(record.lines)
    ? record.lines
    : typeof record.lines === "string"
      ? record.lines.split("\n")
      : [];
  const lines = rawLines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);
  return { title, lines };
}

export function useJuniorGolfConfig(firebase: Firebase | null) {
  const [config, setConfig] = useState<JuniorGolfConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase) return;

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.juniorGolfConfigRef(),
      (snapshot) => {
        const data = (snapshot.data() as DocumentData | undefined) ?? {};
        const heroTitle = asString(data.heroTitle).trim() || DEFAULT_CONFIG.heroTitle;
        const heroSubtitle = asString(data.heroSubtitle).trim();
        const heroDescription = asString(data.heroDescription).trim();
        const heroImageUrl = asString(data.heroImageUrl).trim();

        const programs = Array.isArray(data.programs)
          ? data.programs.map(normalizeProgram).filter(Boolean)
          : [];

        const lessonRates = Array.isArray(data.lessonRates)
          ? data.lessonRates.map(normalizeRate).filter(Boolean)
          : [];

        setConfig({
          heroTitle,
          heroSubtitle: heroSubtitle || null,
          heroDescription: heroDescription || null,
          heroImageUrl: heroImageUrl || null,
          programs: programs as JuniorGolfProgram[],
          lessonRates: lessonRates as JuniorGolfLessonRate[],
        });

        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useJuniorGolfConfig] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setConfig(DEFAULT_CONFIG);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  return useMemo(() => ({ config, loading, error }), [config, loading, error]);
}

