"use client";

export type AdminInquiryKind =
  | "franchise"
  | "career"
  | "lesson"
  | "league"
  | "fitting"
  | "membership"
  | "event";

export type AdminInquiryReadState = {
  lastViewedAt: Date | null;
  readIds: Set<string>;
  unreadIds: Set<string>;
};

export type AdminInquiryReadStateMap = Record<AdminInquiryKind, AdminInquiryReadState>;

const createEmptyReadState = (): AdminInquiryReadState => ({
  lastViewedAt: null,
  readIds: new Set<string>(),
  unreadIds: new Set<string>(),
});

export const DEFAULT_READ_STATE_MAP: AdminInquiryReadStateMap = {
  franchise: createEmptyReadState(),
  career: createEmptyReadState(),
  lesson: createEmptyReadState(),
  league: createEmptyReadState(),
  fitting: createEmptyReadState(),
  membership: createEmptyReadState(),
  event: createEmptyReadState(),
};

function resolveDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") {
      const parsed = maybe.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function resolveStringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set<string>();
  }
  const next = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry === "string" && entry) {
      next.add(entry);
    }
  });
  return next;
}

export function resolveAdminInquiryReadState(
  raw: unknown,
): AdminInquiryReadState {
  if (!raw || typeof raw !== "object") {
    return {
      lastViewedAt: null,
      readIds: new Set<string>(),
      unreadIds: new Set<string>(),
    };
  }
  const data = raw as Record<string, unknown>;
  return {
    lastViewedAt: resolveDate(data.lastViewedAt),
    readIds: resolveStringSet(data.readIds),
    unreadIds: resolveStringSet(data.unreadIds),
  };
}

export function resolveAdminInquiryReadStateMap(
  raw: unknown,
): AdminInquiryReadStateMap {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    franchise: resolveAdminInquiryReadState(data.franchise),
    career: resolveAdminInquiryReadState(data.career),
    lesson: resolveAdminInquiryReadState(data.lesson),
    league: resolveAdminInquiryReadState(data.league),
    fitting: resolveAdminInquiryReadState(data.fitting),
    membership: resolveAdminInquiryReadState(data.membership),
    event: resolveAdminInquiryReadState(data.event),
  };
}
