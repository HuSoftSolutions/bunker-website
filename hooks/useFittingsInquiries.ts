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

export type FittingsInquiry = {
  inquiryId: string;
  name: string;
  phone: string;
  email: string;
  fittingInterest: string;
  locationPreference: string;
  timePreference: string;
  notes?: string | null;
  emailTo: string[];
  createdAtDate?: Date | null;
  workflowStatus: InquiryWorkflowStatus;
  workflowAssignedTo: string;
};

export type UseFittingsInquiriesValue = {
  inquiries: FittingsInquiry[];
  loading: boolean;
  error: Error | null;
};

type UseFittingsInquiriesOptions = {
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

export function useFittingsInquiries(
  firebase: Firebase | null,
  options: UseFittingsInquiriesOptions = {},
): UseFittingsInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<FittingsInquiry[]>([]);
  const refreshToken = options.refreshToken ?? 0;

  useEffect(() => {
    if (!firebase) return;

    setLoading(true);
    setError(null);

    const q = query(firebase.fittingsInquiriesRef(), orderBy("createdAt", "desc"));

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

          return {
            inquiryId: doc.id,
            name: (data.name as string) ?? "",
            phone: (data.phone as string) ?? "",
            email: (data.email as string) ?? "",
            fittingInterest: (data.fittingInterest as string) ?? "",
            locationPreference: (data.locationPreference as string) ?? "",
            timePreference: (data.timePreference as string) ?? "",
            notes: typeof data.notes === "string" ? data.notes : null,
            emailTo: normalizeEmails(data.emailTo),
            createdAtDate,
            workflowStatus: workflow.status ?? DEFAULT_WORKFLOW_STATUS,
            workflowAssignedTo: workflow.assignedTo ?? "",
          } satisfies FittingsInquiry;
        });

        setRecords(inquiries);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useFittingsInquiries] failed to load", err);
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
