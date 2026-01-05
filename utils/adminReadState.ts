"use client";

export const ADMIN_INQUIRY_READ_STATE_EVENT = "admin-inquiry-read-state-changed";

export type AdminInquiryKind =
  | "franchise"
  | "career"
  | "lesson"
  | "league"
  | "fitting"
  | "membership"
  | "event";

export const ADMIN_INQUIRY_STORAGE_KEYS: Record<
  AdminInquiryKind,
  { lastViewed: string; readIds: string }
> = {
  franchise: {
    lastViewed: "admin-franchise-inquiries-last-viewed",
    readIds: "admin-franchise-inquiries-read-ids",
  },
  career: {
    lastViewed: "admin-career-inquiries-last-viewed",
    readIds: "admin-career-inquiries-read-ids",
  },
  lesson: {
    lastViewed: "admin-lesson-inquiries-last-viewed",
    readIds: "admin-lesson-inquiries-read-ids",
  },
  league: {
    lastViewed: "admin-league-inquiries-last-viewed",
    readIds: "admin-league-inquiries-read-ids",
  },
  fitting: {
    lastViewed: "admin-fitting-inquiries-last-viewed",
    readIds: "admin-fitting-inquiries-read-ids",
  },
  membership: {
    lastViewed: "admin-membership-inquiries-last-viewed",
    readIds: "admin-membership-inquiries-read-ids",
  },
  event: {
    lastViewed: "admin-event-inquiries-last-viewed",
    readIds: "admin-event-inquiries-read-ids",
  },
};

export function emitAdminInquiryReadStateChanged(kind?: AdminInquiryKind) {
  if (typeof window === "undefined") {
    return;
  }
  const detail = kind ? { kind } : undefined;
  window.dispatchEvent(new CustomEvent(ADMIN_INQUIRY_READ_STATE_EVENT, { detail }));
}
