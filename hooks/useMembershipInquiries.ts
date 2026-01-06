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

export type MembershipInquiry = {
  inquiryId: string;
  recipientName: string;
  fullName: string;
  email: string;
  phone: string;
  primaryLocation: string;
  membershipType: string;
  referredBy?: string | null;
  notes?: string | null;
  emailTo: string[];
  createdAtDate?: Date | null;
  archivedAt?: string | null;
  archivedAtDate?: Date | null;
  workflowStatus: InquiryWorkflowStatus;
  workflowAssignedTo: string;
};

export type UseMembershipInquiriesValue = {
  inquiries: MembershipInquiry[];
  loading: boolean;
  error: Error | null;
};

type UseMembershipInquiriesOptions = {
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

export function useMembershipInquiries(
  firebase: Firebase | null,
  options: UseMembershipInquiriesOptions = {},
): UseMembershipInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<MembershipInquiry[]>([]);
  const refreshToken = options.refreshToken ?? 0;

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(firebase.membershipInquiriesRef(), orderBy("createdAt", "desc"));

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
            recipientName: typeof data.recipientName === "string" ? data.recipientName : "",
            fullName: typeof data.fullName === "string" ? data.fullName : "",
            email: typeof data.email === "string" ? data.email : "",
            phone: typeof data.phone === "string" ? data.phone : "",
            primaryLocation: typeof data.primaryLocation === "string" ? data.primaryLocation : "",
            membershipType: typeof data.membershipType === "string" ? data.membershipType : "",
            referredBy: typeof data.referredBy === "string" ? data.referredBy : null,
            notes: typeof data.notes === "string" ? data.notes : null,
            emailTo: normalizeEmails(data.emailTo),
            createdAtDate,
            archivedAt: archive.archivedAt,
            archivedAtDate: archive.archivedAtDate,
            workflowStatus: workflow.status ?? DEFAULT_WORKFLOW_STATUS,
            workflowAssignedTo: workflow.assignedTo ?? "",
          } satisfies MembershipInquiry;
        });

        setRecords(inquiries.filter((inquiry) => !inquiry.archivedAt));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useMembershipInquiries] failed to load", err);
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
