"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type Firebase from "@/lib/firebase/client";
import { useFranchiseInquiries } from "@/hooks/useFranchiseInquiries";
import { useCareerInquiries } from "@/hooks/useCareerInquiries";
import { useLessonsInquiries } from "@/hooks/useLessonsInquiries";
import { useLeaguesInquiries } from "@/hooks/useLeaguesInquiries";
import { useFittingsInquiries } from "@/hooks/useFittingsInquiries";
import { useMembershipInquiries } from "@/hooks/useMembershipInquiries";
import { useEventsInquiries } from "@/hooks/useEventsInquiries";
import {
  type AdminInquiryKind,
  resolveAdminInquiryReadStateMap,
} from "@/utils/adminReadState";
import { useAuth } from "@/providers/AuthProvider";
import { onSnapshot } from "firebase/firestore";

function formatBadgeValue(count: number) {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

type InquiryUnreadBadgeProps = {
  firebase: Firebase;
  kind: AdminInquiryKind;
  className?: string;
};

export function InquiryUnreadBadge({ firebase, kind, className }: InquiryUnreadBadgeProps) {
  const { authUser } = useAuth();
  const userId = typeof authUser?.uid === "string" ? authUser.uid : null;
  const franchise = useFranchiseInquiries(firebase, {});
  const career = useCareerInquiries(firebase);
  const lesson = useLessonsInquiries(firebase);
  const league = useLeaguesInquiries(firebase);
  const fitting = useFittingsInquiries(firebase);
  const membership = useMembershipInquiries(firebase);
  const events = useEventsInquiries(firebase);

  const [readStateMap, setReadStateMap] = useState(() => resolveAdminInquiryReadStateMap(null));

  useEffect(() => {
    if (!userId) {
      setReadStateMap(resolveAdminInquiryReadStateMap(null));
      return;
    }
    const unsubscribe = onSnapshot(firebase.userRef(userId), (snapshot) => {
      setReadStateMap(
        resolveAdminInquiryReadStateMap(snapshot.data()?.adminInquiryState),
      );
    });
    return () => {
      unsubscribe();
    };
  }, [firebase, userId]);

  const unreadCount = useMemo(() => {
    const readState = readStateMap[kind];
    const lastViewedAt = readState?.lastViewedAt ?? null;
    const readIds = readState?.readIds ?? new Set<string>();
    const unreadIds = readState?.unreadIds ?? new Set<string>();

    if (kind === "franchise") {
      return franchise.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.submittedAtDate ?? inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "career") {
      return career.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "lesson") {
      return lesson.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "fitting") {
      return fitting.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "membership") {
      return membership.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "event") {
      return events.inquiries.reduce((count, inquiry) => {
        if (unreadIds.has(inquiry.inquiryId)) return count + 1;
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    return league.inquiries.reduce((count, inquiry) => {
      if (unreadIds.has(inquiry.inquiryId)) return count + 1;
      if (readIds.has(inquiry.inquiryId)) return count;
      const recordDate = inquiry.createdAtDate ?? null;
      if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
      return count + 1;
    }, 0);
  }, [
    kind,
    readStateMap,
    franchise.inquiries,
    career.inquiries,
    lesson.inquiries,
    league.inquiries,
    fitting.inquiries,
    membership.inquiries,
    events.inquiries,
  ]);

  if (!userId) {
    return null;
  }

  if (!unreadCount) {
    return null;
  }

  return (
    <span
      className={clsx(
        "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-lg shadow-black/40",
        className,
      )}
      aria-label={`${unreadCount} unread`}
    >
      {formatBadgeValue(unreadCount)}
    </span>
  );
}
