"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData } from "firebase/firestore";

export type InquirySettings = {
  careersDefaultRecipients: string[];
  lessonsDefaultRecipients: string[];
  leaguesDefaultRecipients: string[];
  fittingsDefaultRecipients: string[];
};

const DEFAULT_SETTINGS: InquirySettings = {
  careersDefaultRecipients: ["careers@getinthebunker.golf"],
  lessonsDefaultRecipients: ["lessons@getinthebunker.golf"],
  leaguesDefaultRecipients: ["leagues@getinthebunker.golf"],
  fittingsDefaultRecipients: ["fittings@getinthebunker.golf"],
};

function normalizeRecipients(value: unknown, fallback: string[]) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const uniq = new Set<string>();
  list.forEach((email) => {
    if (typeof email === "string" && email.trim()) {
      uniq.add(email.trim());
    }
  });
  const result = Array.from(uniq);
  return result.length ? result : fallback;
}

export function useInquirySettings(firebase: Firebase | null) {
  const [settings, setSettings] = useState<InquirySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.inquirySettingsRef(),
      (snapshot) => {
        const data = (snapshot.data() as DocumentData | undefined) ?? {};
        setSettings({
          careersDefaultRecipients: normalizeRecipients(
            data?.careersDefaultRecipients,
            DEFAULT_SETTINGS.careersDefaultRecipients,
          ),
          lessonsDefaultRecipients: normalizeRecipients(
            data?.lessonsDefaultRecipients,
            DEFAULT_SETTINGS.lessonsDefaultRecipients,
          ),
          leaguesDefaultRecipients: normalizeRecipients(
            data?.leaguesDefaultRecipients,
            DEFAULT_SETTINGS.leaguesDefaultRecipients,
          ),
          fittingsDefaultRecipients: normalizeRecipients(
            data?.fittingsDefaultRecipients,
            DEFAULT_SETTINGS.fittingsDefaultRecipients,
          ),
        });
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useInquirySettings] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  return useMemo(() => ({ settings, loading, error }), [settings, loading, error]);
}
