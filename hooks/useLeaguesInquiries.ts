"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import {
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import {
  DEFAULT_WORKFLOW_STATUS,
  parseWorkflowFromData,
  type InquiryWorkflowStatus,
} from "@/utils/inquiryWorkflow";
import { resolveArchiveState } from "@/utils/inquiryArchive";

export type LeaguesInquiry = {
  inquiryId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  preferredTime: string;
  preferredTimeDisplay?: string | null;
  season: string;
  players: number;
  message?: string | null;
  emailTo: string[];
  createdAtDate?: Date | null;
  archivedAt?: string | null;
  archivedAtDate?: Date | null;
  workflowStatus: InquiryWorkflowStatus;
  workflowAssignedTo: string;
};

export type UseLeaguesInquiriesValue = {
  inquiries: LeaguesInquiry[];
  loading: boolean;
  error: Error | null;
};

type UseLeaguesInquiriesOptions = {
  refreshToken?: number;
};

function timestampToDate(value: unknown) {
  const candidate = value as Timestamp | undefined;
  if (candidate && typeof candidate.toDate === "function") {
    const result = candidate.toDate();
    if (!Number.isNaN(result.getTime())) {
      return result;
    }
  }
  return null;
}

function normalizeEmails(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const uniq = new Set<string>();
  list.forEach((email) => {
    if (typeof email === "string" && email.trim()) {
      uniq.add(email.trim());
    }
  });
  return Array.from(uniq);
}

export function useLeaguesInquiries(
  firebase: Firebase | null,
  options: UseLeaguesInquiriesOptions = {},
): UseLeaguesInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<LeaguesInquiry[]>([]);
  const refreshToken = options.refreshToken ?? 0;

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(firebase.leaguesInquiriesRef(), orderBy("createdAt", "desc"));

    const off = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const inquiries = snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const createTime = (doc as { createTime?: { toDate?: () => Date } }).createTime;
          const createdAtDate =
            timestampToDate(data.createdAt) ??
            (typeof createTime?.toDate === "function" ? createTime.toDate() : null);
          const workflow = parseWorkflowFromData(data);
          const archive = resolveArchiveState(data.archivedAt);

          return {
            inquiryId: doc.id,
            firstName: (data.firstName as string) ?? "",
            lastName: (data.lastName as string) ?? "",
            phone: (data.phone as string) ?? "",
            email: (data.email as string) ?? "",
            location: (data.location as string) ?? "",
            preferredTime: (data.preferredTime as string) ?? "",
            preferredTimeDisplay:
              typeof data.preferredTimeDisplay === "string"
                ? data.preferredTimeDisplay
                : null,
            season: (data.season as string) ?? "",
            players:
              typeof data.players === "number" && !Number.isNaN(data.players)
                ? data.players
                : 0,
            message: typeof data.message === "string" ? data.message : null,
            emailTo: normalizeEmails(data.emailTo),
            createdAtDate,
            archivedAt: archive.archivedAt,
            archivedAtDate: archive.archivedAtDate,
            workflowStatus: workflow.status ?? DEFAULT_WORKFLOW_STATUS,
            workflowAssignedTo: workflow.assignedTo ?? "",
          } satisfies LeaguesInquiry;
        });

        setRecords(inquiries.filter((inquiry) => !inquiry.archivedAt));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useLeaguesInquiries] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setRecords([]);
        setLoading(false);
      },
    );

    return () => off();
  }, [firebase, refreshToken]);

  return useMemo(
    () => ({ inquiries: records, loading, error }),
    [records, loading, error],
  );
}
