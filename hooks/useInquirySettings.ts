"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData } from "firebase/firestore";
import { WORKFLOW_STATUSES } from "@/utils/inquiryWorkflow";

export type InquirySettings = {
  franchiseDefaultRecipients: string[];
  careersDefaultRecipients: string[];
  lessonsDefaultRecipients: string[];
  leaguesDefaultRecipients: string[];
  fittingsDefaultRecipients: string[];
  membershipsDefaultRecipients: string[];
  eventsDefaultRecipients: string[];
  franchiseSendEmails: boolean;
  careersSendEmails: boolean;
  lessonsSendEmails: boolean;
  leaguesSendEmails: boolean;
  fittingsSendEmails: boolean;
  membershipsSendEmails: boolean;
  eventsSendEmails: boolean;
  franchiseBoardEnabled: boolean;
  careersBoardEnabled: boolean;
  lessonsBoardEnabled: boolean;
  leaguesBoardEnabled: boolean;
  fittingsBoardEnabled: boolean;
  membershipsBoardEnabled: boolean;
  eventsBoardEnabled: boolean;
  franchiseBoardStatuses: string[];
  careersBoardStatuses: string[];
  lessonsBoardStatuses: string[];
  leaguesBoardStatuses: string[];
  fittingsBoardStatuses: string[];
  membershipsBoardStatuses: string[];
  eventsBoardStatuses: string[];
};

const DEFAULT_SETTINGS: InquirySettings = {
  franchiseDefaultRecipients: ["franchise@getinthebunker.golf"],
  careersDefaultRecipients: ["careers@getinthebunker.golf"],
  lessonsDefaultRecipients: ["lessons@getinthebunker.golf"],
  leaguesDefaultRecipients: ["leagues@getinthebunker.golf"],
  fittingsDefaultRecipients: ["fittings@getinthebunker.golf"],
  membershipsDefaultRecipients: ["memberships@getinthebunker.golf"],
  eventsDefaultRecipients: ["events@getinthebunker.golf"],
  franchiseSendEmails: true,
  careersSendEmails: true,
  lessonsSendEmails: true,
  leaguesSendEmails: true,
  fittingsSendEmails: true,
  membershipsSendEmails: true,
  eventsSendEmails: true,
  franchiseBoardEnabled: true,
  careersBoardEnabled: true,
  lessonsBoardEnabled: true,
  leaguesBoardEnabled: true,
  fittingsBoardEnabled: true,
  membershipsBoardEnabled: true,
  eventsBoardEnabled: true,
  franchiseBoardStatuses: [...WORKFLOW_STATUSES],
  careersBoardStatuses: [...WORKFLOW_STATUSES],
  lessonsBoardStatuses: [...WORKFLOW_STATUSES],
  leaguesBoardStatuses: [...WORKFLOW_STATUSES],
  fittingsBoardStatuses: [...WORKFLOW_STATUSES],
  membershipsBoardStatuses: [...WORKFLOW_STATUSES],
  eventsBoardStatuses: [...WORKFLOW_STATUSES],
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

function normalizeStatuses(value: unknown) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const uniq = new Set<string>();
  list.forEach((lane) => {
    if (typeof lane === "string" && lane.trim()) {
      uniq.add(lane.trim());
    }
  });
  return Array.from(uniq);
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
        const hasStatuses = (key: string) =>
          Object.prototype.hasOwnProperty.call(data, key);
        setSettings({
          franchiseDefaultRecipients: normalizeRecipients(
            data?.franchiseDefaultRecipients,
            DEFAULT_SETTINGS.franchiseDefaultRecipients,
          ),
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
          membershipsDefaultRecipients: normalizeRecipients(
            data?.membershipsDefaultRecipients,
            DEFAULT_SETTINGS.membershipsDefaultRecipients,
          ),
          eventsDefaultRecipients: normalizeRecipients(
            data?.eventsDefaultRecipients,
            DEFAULT_SETTINGS.eventsDefaultRecipients,
          ),
          franchiseSendEmails: data?.franchiseSendEmails !== false,
          careersSendEmails: data?.careersSendEmails !== false,
          lessonsSendEmails: data?.lessonsSendEmails !== false,
          leaguesSendEmails: data?.leaguesSendEmails !== false,
          fittingsSendEmails: data?.fittingsSendEmails !== false,
          membershipsSendEmails: data?.membershipsSendEmails !== false,
          eventsSendEmails: data?.eventsSendEmails !== false,
          franchiseBoardEnabled: data?.franchiseBoardEnabled !== false,
          careersBoardEnabled: data?.careersBoardEnabled !== false,
          lessonsBoardEnabled: data?.lessonsBoardEnabled !== false,
          leaguesBoardEnabled: data?.leaguesBoardEnabled !== false,
          fittingsBoardEnabled: data?.fittingsBoardEnabled !== false,
          membershipsBoardEnabled: data?.membershipsBoardEnabled !== false,
          eventsBoardEnabled: data?.eventsBoardEnabled !== false,
          franchiseBoardStatuses: hasStatuses("franchiseBoardStatuses")
            ? normalizeStatuses(data?.franchiseBoardStatuses)
            : DEFAULT_SETTINGS.franchiseBoardStatuses,
          careersBoardStatuses: hasStatuses("careersBoardStatuses")
            ? normalizeStatuses(data?.careersBoardStatuses)
            : DEFAULT_SETTINGS.careersBoardStatuses,
          lessonsBoardStatuses: hasStatuses("lessonsBoardStatuses")
            ? normalizeStatuses(data?.lessonsBoardStatuses)
            : DEFAULT_SETTINGS.lessonsBoardStatuses,
          leaguesBoardStatuses: hasStatuses("leaguesBoardStatuses")
            ? normalizeStatuses(data?.leaguesBoardStatuses)
            : DEFAULT_SETTINGS.leaguesBoardStatuses,
          fittingsBoardStatuses: hasStatuses("fittingsBoardStatuses")
            ? normalizeStatuses(data?.fittingsBoardStatuses)
            : DEFAULT_SETTINGS.fittingsBoardStatuses,
          membershipsBoardStatuses: hasStatuses("membershipsBoardStatuses")
            ? normalizeStatuses(data?.membershipsBoardStatuses)
            : DEFAULT_SETTINGS.membershipsBoardStatuses,
          eventsBoardStatuses: hasStatuses("eventsBoardStatuses")
            ? normalizeStatuses(data?.eventsBoardStatuses)
            : DEFAULT_SETTINGS.eventsBoardStatuses,
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
