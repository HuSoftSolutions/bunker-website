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

export type CareerInquiry = {
  inquiryId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  position: string;
  skillLevel: string;
  message: string;
  emailTo: string[];
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
  createdAtDate?: Date | null;
};

export type UseCareerInquiriesValue = {
  inquiries: CareerInquiry[];
  loading: boolean;
  error: Error | null;
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

export function useCareerInquiries(firebase: Firebase | null): UseCareerInquiriesValue {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<CareerInquiry[]>([]);

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(firebase.careerInquiriesRef(), orderBy("createdAt", "desc"));

    const off = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const inquiries = snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const createTime = (doc as { createTime?: { toDate?: () => Date } }).createTime;
          const createdAtDate =
            timestampToDate(data.createdAt) ??
            (typeof createTime?.toDate === "function" ? createTime.toDate() : null);

          return {
            inquiryId: doc.id,
            firstName: (data.firstName as string) ?? "",
            lastName: (data.lastName as string) ?? "",
            phone: (data.phone as string) ?? "",
            email: (data.email as string) ?? "",
            location: (data.location as string) ?? "",
            position: (data.position as string) ?? "",
            skillLevel: (data.skillLevel as string) ?? "",
            message: (data.message as string) ?? "",
            emailTo: normalizeEmails(data.emailTo),
            resumeUrl: typeof data.resumeUrl === "string" ? data.resumeUrl : null,
            resumeFileName:
              typeof data.resumeFileName === "string" ? data.resumeFileName : null,
            resumeMimeType:
              typeof data.resumeMimeType === "string" ? data.resumeMimeType : null,
            createdAtDate,
          } satisfies CareerInquiry;
        });

        setRecords(inquiries);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useCareerInquiries] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setRecords([]);
        setLoading(false);
      },
    );

    return () => off();
  }, [firebase]);

  return useMemo(
    () => ({ inquiries: records, loading, error }),
    [records, loading, error],
  );
}

