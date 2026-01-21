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

export type MemberRecord = {
  memberId: string;
  fullName: string;
  recipientName: string;
  email: string;
  phone: string;
  primaryLocation: string;
  primaryLocationId?: string | null;
  membershipType: string;
  referredBy?: string | null;
  notes?: string | null;
  inquiryId?: string | null;
  membershipPaidAt?: string | null;
  membershipPaidAtDate?: Date | null;
  membershipExpiresAt?: string | null;
  membershipExpiresAtDate?: Date | null;
  createdAtDate?: Date | null;
  updatedAtDate?: Date | null;
};

export type UseMembersValue = {
  members: MemberRecord[];
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

function resolveDateValue(value: unknown) {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return timestampToDate(value);
}

export function useMembers(firebase: Firebase | null): UseMembersValue {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase) {
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(firebase.membersRef(), orderBy("createdAt", "desc"));
    const off = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const records = snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const createTime = (doc as { createTime?: { toDate?: () => Date } }).createTime;
          const updateTime = (doc as { updateTime?: { toDate?: () => Date } }).updateTime;

          const createdAtDate =
            timestampToDate(data.createdAt) ??
            (typeof createTime?.toDate === "function" ? createTime.toDate() : null);
          const updatedAtDate =
            timestampToDate(data.updatedAt) ??
            (typeof updateTime?.toDate === "function" ? updateTime.toDate() : null);
          const membershipPaidAtDate = resolveDateValue(data.membershipPaidAt);
          const membershipExpiresAtDate = resolveDateValue(data.membershipExpiresAt);

          return {
            memberId: doc.id,
            fullName: typeof data.fullName === "string" ? data.fullName : "",
            recipientName: typeof data.recipientName === "string" ? data.recipientName : "",
            email: typeof data.email === "string" ? data.email : "",
            phone: typeof data.phone === "string" ? data.phone : "",
            primaryLocation:
              typeof data.primaryLocation === "string" ? data.primaryLocation : "",
            primaryLocationId:
              typeof data.primaryLocationId === "string" ? data.primaryLocationId : null,
            membershipType:
              typeof data.membershipType === "string" ? data.membershipType : "",
            referredBy: typeof data.referredBy === "string" ? data.referredBy : null,
            notes: typeof data.notes === "string" ? data.notes : null,
            inquiryId: typeof data.inquiryId === "string" ? data.inquiryId : null,
            membershipPaidAt:
              typeof data.membershipPaidAt === "string" ? data.membershipPaidAt : null,
            membershipPaidAtDate,
            membershipExpiresAt:
              typeof data.membershipExpiresAt === "string" ? data.membershipExpiresAt : null,
            membershipExpiresAtDate,
            createdAtDate,
            updatedAtDate,
          } satisfies MemberRecord;
        });

        setMembers(records);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useMembers] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setMembers([]);
        setLoading(false);
      },
    );

    return () => off();
  }, [firebase]);

  return useMemo(
    () => ({ members, loading, error }),
    [members, loading, error],
  );
}
