"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData } from "firebase/firestore";

export type FittingsFeeItem = {
  title: string;
  description?: string | null;
};

export type FittingsConfig = {
  heroTitle: string;
  heroSubtitle?: string | null;
  heroDescription?: string | null;
  heroImageUrl?: string | null;
  feeItems: FittingsFeeItem[];
  feeNote?: string | null;
  interestOptions: string[];
  locationOptions: string[];
  timeOptions: string[];
};

const DEFAULT_CONFIG: FittingsConfig = {
  heroTitle: "Club Fitting",
  heroSubtitle: null,
  heroDescription: "Get a personalized fitting from our golf professionals",
  heroImageUrl:
    "https://storage.googleapis.com/thebunker-assets/thebunker/pexels-thomasleeward-2828723.jpg",
  feeItems: [
    { title: "Driver, Fairway Wood, or Hybrid Fitting", description: "$75 — Takes about 1 hour" },
    { title: "Iron Fitting", description: "$75 — Takes about 1 hour" },
    { title: "Full Bag Fitting", description: "$125 — Takes 1.5–2 hours" },
  ],
  feeNote:
    "The fitting fee will be waived if a purchase/order is made the same day as the fitting or will be applied to a purchase/order made within one week of the fitting.",
  interestOptions: ["Driver, Fairway Wood, or Hybrid", "Iron", "Full Bag"],
  locationOptions: [
    "Guilderland, NY",
    "Clifton Park, NY",
    "North Greenbush, NY",
    "Latham, NY",
    "Saratoga, NY",
    "Other",
  ],
  timeOptions: ["Morning", "Afternoon", "Evening"],
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
  const uniq = new Set<string>();
  list.forEach((item) => {
    if (typeof item === "string" && item.trim()) {
      uniq.add(item.trim());
    }
  });
  return Array.from(uniq);
}

function normalizeFeeItem(value: unknown): FittingsFeeItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asString(record.title).trim();
  if (!title) return null;
  const description = asString(record.description).trim();
  return { title, description: description || null };
}

export function useFittingsConfig(firebase: Firebase | null) {
  const [config, setConfig] = useState<FittingsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase) return;

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.fittingsConfigRef(),
      (snapshot) => {
        const data = (snapshot.data() as DocumentData | undefined) ?? {};
        const heroTitle = asString(data.heroTitle).trim() || DEFAULT_CONFIG.heroTitle;
        const heroSubtitle = asString(data.heroSubtitle).trim();
        const heroDescription = asString(data.heroDescription).trim();
        const heroImageUrl = asString(data.heroImageUrl).trim();

        const feeItems = Array.isArray(data.feeItems)
          ? data.feeItems.map(normalizeFeeItem).filter(Boolean)
          : DEFAULT_CONFIG.feeItems;

        const feeNote = asString(data.feeNote).trim();

        const interestOptions =
          normalizeList(data.interestOptions).length
            ? normalizeList(data.interestOptions)
            : DEFAULT_CONFIG.interestOptions;
        const locationOptions =
          normalizeList(data.locationOptions).length
            ? normalizeList(data.locationOptions)
            : DEFAULT_CONFIG.locationOptions;
        const timeOptions =
          normalizeList(data.timeOptions).length
            ? normalizeList(data.timeOptions)
            : DEFAULT_CONFIG.timeOptions;

        setConfig({
          heroTitle,
          heroSubtitle: heroSubtitle || null,
          heroDescription: heroDescription || DEFAULT_CONFIG.heroDescription,
          heroImageUrl: heroImageUrl || DEFAULT_CONFIG.heroImageUrl,
          feeItems: feeItems as FittingsFeeItem[],
          feeNote: feeNote || DEFAULT_CONFIG.feeNote,
          interestOptions,
          locationOptions,
          timeOptions,
        });
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useFittingsConfig] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setConfig(DEFAULT_CONFIG);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  return useMemo(() => ({ config, loading, error }), [config, loading, error]);
}

