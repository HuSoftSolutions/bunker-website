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
  ADMIN_INQUIRY_READ_STATE_EVENT,
  ADMIN_INQUIRY_STORAGE_KEYS,
  type AdminInquiryKind,
} from "@/utils/adminReadState";

function readLastViewed(key: string) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = new Date(stored);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function readReadIds(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return new Set<string>();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set<string>();
    const next = new Set<string>();
    parsed.forEach((id) => {
      if (typeof id === "string" && id) next.add(id);
    });
    return next;
  } catch {
    return new Set<string>();
  }
}

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
  const franchise = useFranchiseInquiries(firebase, {});
  const career = useCareerInquiries(firebase);
  const lesson = useLessonsInquiries(firebase);
  const league = useLeaguesInquiries(firebase);
  const fitting = useFittingsInquiries(firebase);
  const membership = useMembershipInquiries(firebase);
  const events = useEventsInquiries(firebase);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ kind?: AdminInquiryKind }>;
      if (custom?.detail?.kind && custom.detail.kind !== kind) {
        return;
      }
      setVersion((v) => v + 1);
    };
    window.addEventListener(ADMIN_INQUIRY_READ_STATE_EVENT, handler as EventListener);
    window.addEventListener("storage", handler as EventListener);
    return () => {
      window.removeEventListener(ADMIN_INQUIRY_READ_STATE_EVENT, handler as EventListener);
      window.removeEventListener("storage", handler as EventListener);
    };
  }, [kind]);

  const storageKeys = ADMIN_INQUIRY_STORAGE_KEYS[kind];

  const unreadCount = useMemo(() => {
    const lastViewedAt = readLastViewed(storageKeys.lastViewed);
    const readIds = readReadIds(storageKeys.readIds);

    if (kind === "franchise") {
      return franchise.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.submittedAtDate ?? inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "career") {
      return career.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "lesson") {
      return lesson.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "fitting") {
      return fitting.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "membership") {
      return membership.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    if (kind === "event") {
      return events.inquiries.reduce((count, inquiry) => {
        if (readIds.has(inquiry.inquiryId)) return count;
        const recordDate = inquiry.createdAtDate ?? null;
        if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
        return count + 1;
      }, 0);
    }

    return league.inquiries.reduce((count, inquiry) => {
      if (readIds.has(inquiry.inquiryId)) return count;
      const recordDate = inquiry.createdAtDate ?? null;
      if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
      return count + 1;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    kind,
    storageKeys.lastViewed,
    storageKeys.readIds,
    version,
    franchise.inquiries,
    career.inquiries,
    lesson.inquiries,
    league.inquiries,
    fitting.inquiries,
    membership.inquiries,
    events.inquiries,
  ]);

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
