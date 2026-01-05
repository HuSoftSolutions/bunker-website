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

export type EventsInquiry = {
  inquiryId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneExt?: string | null;
  company?: string | null;
  contactPreference: string;
  eventType: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  headcount: number;
  additionalInfo?: string | null;
  heardAbout: string;
  emailTo: string[];
  createdAtDate?: Date | null;
  workflowStatus: InquiryWorkflowStatus;
  workflowAssignedTo: string;
};

export type UseEventsInquiriesValue = {
  inquiries: EventsInquiry[];
  loading: boolean;
  error: Error | null;
};

type UseEventsInquiriesOptions = {
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

export function useEventsInquiries(
  firebase: Firebase | null,
  options: UseEventsInquiriesOptions = {},
): UseEventsInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<EventsInquiry[]>([]);
  const refreshToken = options.refreshToken ?? 0;

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(firebase.eventsInquiriesRef(), orderBy("createdAt", "desc"));

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
            firstName: (data.firstName as string) ?? "",
            lastName: (data.lastName as string) ?? "",
            email: (data.email as string) ?? "",
            phone: (data.phone as string) ?? "",
            phoneExt: typeof data.phoneExt === "string" ? data.phoneExt : null,
            company: typeof data.company === "string" ? data.company : null,
            contactPreference: (data.contactPreference as string) ?? "",
            eventType: (data.eventType as string) ?? "",
            location: (data.location as string) ?? "",
            eventDate: (data.eventDate as string) ?? "",
            startTime: (data.startTime as string) ?? "",
            endTime: (data.endTime as string) ?? "",
            headcount:
              typeof data.headcount === "number" && !Number.isNaN(data.headcount)
                ? data.headcount
                : 0,
            additionalInfo:
              typeof data.additionalInfo === "string" ? data.additionalInfo : null,
            heardAbout: (data.heardAbout as string) ?? "",
            emailTo: normalizeEmails(data.emailTo),
            createdAtDate,
            workflowStatus: workflow.status ?? DEFAULT_WORKFLOW_STATUS,
            workflowAssignedTo: workflow.assignedTo ?? "",
          } satisfies EventsInquiry;
        });

        setRecords(inquiries);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useEventsInquiries] failed to load", err);
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
