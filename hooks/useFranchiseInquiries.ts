"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import {
  onSnapshot,
  query,
  orderBy,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import {
  DEFAULT_WORKFLOW_STATUS,
  type InquiryWorkflowStatus,
  parseWorkflowFromData,
} from "@/utils/inquiryWorkflow";
import { resolveArchiveState } from "@/utils/inquiryArchive";

export type FranchiseInquiry = {
  inquiryId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin?: string | null;
  targetGeography?: string | null;
  referral?: string | null;
  submittedAt?: string | null;
  submittedAtDate?: Date | null;
  createdAtDate?: Date | null;
  franchiseSite?: string | null;
  archivedAt?: string | null;
  archivedAtDate?: Date | null;
  workflowStatus: InquiryWorkflowStatus;
  workflowAssignedTo: string;
};

type UseFranchiseInquiriesOptions = {
  franchiseSite?: string;
  refreshToken?: number;
};

export type UseFranchiseInquiriesValue = {
  inquiries: FranchiseInquiry[];
  loading: boolean;
  error: Error | null;
};

export function useFranchiseInquiries(
  firebase: Firebase | null,
  options: UseFranchiseInquiriesOptions = {},
): UseFranchiseInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<FranchiseInquiry[]>([]);

  const franchiseSite = options.franchiseSite ?? "franchise-website";
  const refreshToken = options.refreshToken ?? 0;

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firebase
      .franchiseInquiriesRef(franchiseSite);
    const q = query(unsubscribe, orderBy("submittedAt", "desc"));

    const off = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
          const inquiries = snapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const submittedAtRaw =
              typeof data.submittedAt === "string" ? data.submittedAt : null;
            const submittedAtDate = submittedAtRaw
              ? new Date(submittedAtRaw)
              : null;

            const createTime = (doc as { createTime?: { toDate?: () => Date } }).createTime;
            const createdAtDate =
              typeof createTime?.toDate === "function"
                ? createTime.toDate()
                : null;

          const workflow = parseWorkflowFromData(data);
          const archive = resolveArchiveState(data.archivedAt);

          return {
            inquiryId: (data?.inquiryId as string) ?? doc.id,
            firstName: (data?.firstName as string) ?? "",
              lastName: (data?.lastName as string) ?? "",
              email: (data?.email as string) ?? "",
              phone: (data?.phone as string) ?? "",
              city: (data?.city as string) ?? "",
              country: (data?.country as string) ?? "",
              linkedin:
                typeof data?.linkedin === "string" && data.linkedin.trim()
                  ? data.linkedin.trim()
                  : null,
              targetGeography:
                typeof data?.targetGeography === "string"
                  ? data.targetGeography
                  : null,
              referral:
                typeof data?.referral === "string" ? data.referral : null,
              submittedAt: submittedAtRaw,
              submittedAtDate,
              createdAtDate,
            franchiseSite:
              typeof data?.franchiseSite === "string"
                ? data.franchiseSite
                : null,
            archivedAt: archive.archivedAt,
            archivedAtDate: archive.archivedAtDate,
            workflowStatus: workflow.status ?? DEFAULT_WORKFLOW_STATUS,
            workflowAssignedTo: workflow.assignedTo ?? "",
          } satisfies FranchiseInquiry;
        });

          setRecords(inquiries.filter((inquiry) => !inquiry.archivedAt));
          setLoading(false);
        },
        (err: unknown) => {
          console.error("[useFranchiseInquiries] failed to load", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setRecords([]);
          setLoading(false);
        },
    );

    return () => {
      off();
    };
  }, [firebase, franchiseSite, refreshToken]);

  return useMemo(
    () => ({
      inquiries: records,
      loading,
      error,
    }),
    [records, loading, error],
  );
}
