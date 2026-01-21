"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import type Firebase from "@/lib/firebase/client";
import { useMembershipInquiries, type MembershipInquiry } from "@/hooks/useMembershipInquiries";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import useLocations from "@/hooks/useLocations";
import {
  DEFAULT_WORKFLOW_STATUS,
  type InquiryWorkflowStatus,
  type InquiryWorkflowEntry,
  resolveWorkflowStatus,
} from "@/utils/inquiryWorkflow";
import { formatPhone } from "@/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { type AdminInquiryKind, resolveAdminInquiryReadState } from "@/utils/adminReadState";
import {
  buildInquiryLocationOptions,
  matchesInquiryLocation,
  matchesAllowedInquiryLocations,
} from "@/utils/inquiryLocationFilter";
import { getManagerLocationIds, isAdmin } from "@/utils/auth";
import {
  InquiryBoard,
  type InquiryBoardItem,
} from "./InquiryBoard";
import { addDoc, arrayRemove, arrayUnion, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const VIEW_MODE_STORAGE_KEY = "admin-membership-inquiries-view-mode";

type DateRange = {
  start: string;
  end: string;
};

type ViewMode = "table" | "board";

function resolveRecordDate(inquiry: MembershipInquiry) {
  const candidate = inquiry.createdAtDate ?? null;
  if (!candidate || Number.isNaN(candidate.getTime())) {
    return null;
  }
  return candidate;
}

function formatDateForDisplay(dateValue: Date | null | undefined) {
  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "—";
  }
  try {
    return format(dateValue, "PP p");
  } catch (error) {
    console.warn("[MembershipInquiries] failed to format date", error);
    return dateValue.toLocaleString();
  }
}

function formatDateForInput(dateValue: Date | null | undefined) {
  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "";
  }
  try {
    return format(dateValue, "yyyy-MM-dd");
  } catch (error) {
    console.warn("[MembershipInquiries] failed to format input date", error);
    return "";
  }
}

type InquiryDrawerProps = {
  inquiry: MembershipInquiry | null;
  onClose: () => void;
  onMarkRead: (inquiryId: string) => void;
  onMarkUnread: (inquiryId: string) => void;
  onArchive: (inquiryId: string) => void;
  onConvert: (inquiryId: string) => void;
  isUnread: boolean;
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onPaidDateChange: (inquiryId: string, dateValue: string) => void;
  onExpiresDateChange: (inquiryId: string, dateValue: string) => void;
  boardStatuses: string[];
};

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </p>
      <div className="mt-1 text-sm text-white">{children}</div>
    </div>
  );
}

type MembershipStatusControlsProps = {
  inquiryId: string;
  entry: InquiryWorkflowEntry;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onPaidDateChange: (inquiryId: string, dateValue: string) => void;
  onExpiresDateChange: (inquiryId: string, dateValue: string) => void;
  paidDateValue: string;
  expiresDateValue: string;
  layout?: "stacked" | "inline";
  statuses?: string[];
};

function MembershipStatusControls({
  inquiryId,
  entry,
  onStatusChange,
  onPaidDateChange,
  onExpiresDateChange,
  paidDateValue,
  expiresDateValue,
  layout = "stacked",
  statuses,
}: MembershipStatusControlsProps) {
  const options = statuses?.length ? statuses : [DEFAULT_WORKFLOW_STATUS];
  const resolvedStatus = options.includes(entry.status) ? entry.status : options[0];
  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={clsx(
        "gap-3",
        layout === "inline"
          ? "flex flex-col sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col",
      )}
    >
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-white/60">
        Status
        <select
          value={resolvedStatus}
          onChange={(event) => onStatusChange(inquiryId, event.target.value)}
          onClick={stopPropagation}
          disabled={!statuses?.length}
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white shadow-inner focus:border-primary focus:outline-none"
        >
          {options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-white/60">
        Membership Paid
        <input
          type="date"
          value={paidDateValue}
          onChange={(event) => onPaidDateChange(inquiryId, event.target.value)}
          onClick={stopPropagation}
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white shadow-inner focus:border-primary focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-white/60">
        Membership Expires
        <input
          type="date"
          value={expiresDateValue}
          onChange={(event) => onExpiresDateChange(inquiryId, event.target.value)}
          onClick={stopPropagation}
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white shadow-inner focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  );
}

function InquiryDrawer({
  inquiry,
  onClose,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onConvert,
  isUnread,
  workflowState,
  onStatusChange,
  onPaidDateChange,
  onExpiresDateChange,
  boardStatuses,
}: InquiryDrawerProps) {
  if (!inquiry) {
    return null;
  }

  const submittedDisplay = formatDateForDisplay(resolveRecordDate(inquiry));
  const workflowEntry =
    workflowState[inquiry.inquiryId] ?? {
      assignedTo: "",
      status: DEFAULT_WORKFLOW_STATUS,
    };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
              Membership Inquiry
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white">
              {inquiry.fullName || "Inquiry"}
            </h2>
            <p className="mt-1 text-sm text-white/60">{submittedDisplay}</p>
          </div>
          <div className="flex gap-2">
            {isUnread ? (
              <button
                type="button"
                onClick={() => onMarkRead(inquiry.inquiryId)}
                className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
              >
                Mark Read
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onMarkUnread(inquiry.inquiryId)}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-primary/60 hover:text-primary"
              >
                Mark Unread
              </button>
            )}
            <button
              type="button"
              onClick={() => onConvert(inquiry.inquiryId)}
              disabled={Boolean(inquiry.convertedMemberId)}
              className={clsx(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                inquiry.convertedMemberId
                  ? "cursor-not-allowed border-white/10 text-white/40"
                  : "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10",
              )}
            >
              {inquiry.convertedMemberId ? "Converted" : "Convert to Member"}
            </button>
            <button
              type="button"
              onClick={() => onArchive(inquiry.inquiryId)}
              className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4">
          <MembershipStatusControls
            inquiryId={inquiry.inquiryId}
            entry={workflowEntry}
            onStatusChange={onStatusChange}
            onPaidDateChange={onPaidDateChange}
            onExpiresDateChange={onExpiresDateChange}
            paidDateValue={formatDateForInput(inquiry.membershipPaidAtDate)}
            expiresDateValue={formatDateForInput(inquiry.membershipExpiresAtDate)}
            layout="inline"
            statuses={boardStatuses}
          />
        </div>

        <div className="mt-6 grid gap-3">
          <DrawerField label="Inquiry ID">{inquiry.inquiryId}</DrawerField>
          <DrawerField label="Member Record">
            {inquiry.convertedMemberId ? inquiry.convertedMemberId : "Not converted"}
          </DrawerField>
          <DrawerField label="Recipient Name">{inquiry.recipientName || "—"}</DrawerField>
          <DrawerField label="Full Name">{inquiry.fullName || "—"}</DrawerField>
          <DrawerField label="Email">
            <a
              href={`mailto:${inquiry.email}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {inquiry.email}
            </a>
          </DrawerField>
          <DrawerField label="Phone">
            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {formatPhone(inquiry.phone)}
              </a>
            ) : (
              <span className="text-white/60">—</span>
            )}
          </DrawerField>
          <DrawerField label="Primary Location">{inquiry.primaryLocation || "—"}</DrawerField>
          <DrawerField label="Membership Type">{inquiry.membershipType || "—"}</DrawerField>
          <DrawerField label="Membership Paid">
            {inquiry.membershipPaidAtDate
              ? formatDateForDisplay(inquiry.membershipPaidAtDate)
              : "—"}
          </DrawerField>
          <DrawerField label="Membership Expires">
            {inquiry.membershipExpiresAtDate
              ? formatDateForDisplay(inquiry.membershipExpiresAtDate)
              : "—"}
          </DrawerField>
          <DrawerField label="Referred By">{inquiry.referredBy || "—"}</DrawerField>
          <DrawerField label="Recipients">
            <span className="text-white/80">
              {inquiry.emailTo.length ? inquiry.emailTo.join(", ") : "—"}
            </span>
          </DrawerField>
          <DrawerField label="Notes">
            <p className="whitespace-pre-wrap text-white/80">{inquiry.notes ?? "—"}</p>
          </DrawerField>
        </div>
      </div>
    </div>
  );
}

type MembershipInquiriesPanelProps = {
  firebase: Firebase;
};

export function MembershipInquiriesPanel({ firebase }: MembershipInquiriesPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locations } = useLocations(firebase);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set<string>());
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set<string>());
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showArchived, setShowArchived] = useState(false);
  const inquiryLocationId = searchParams?.get("inquiryLocationId") ?? "";
  const { authUser } = useAuth();
  const locationOptions = useMemo(
    () => buildInquiryLocationOptions(locations),
    [locations],
  );
  const resolveInquiryLocation = useCallback(
    (primaryLocation: string) =>
      locationOptions.find((option) =>
        matchesInquiryLocation(primaryLocation, option),
      ) ?? null,
    [locationOptions],
  );
  const isAdminUser = isAdmin(authUser);
  const managerLocationIds = useMemo(
    () => getManagerLocationIds(authUser),
    [authUser],
  );
  const availableLocationOptions = useMemo(() => {
    if (isAdminUser) {
      return locationOptions;
    }
    if (!managerLocationIds.length) {
      return [];
    }
    return locationOptions.filter((option) =>
      managerLocationIds.includes(option.id),
    );
  }, [isAdminUser, locationOptions, managerLocationIds]);
  const selectedLocation = useMemo(
    () =>
      inquiryLocationId
        ? availableLocationOptions.find(
            (option) => option.id === inquiryLocationId,
          ) ?? null
        : null,
    [availableLocationOptions, inquiryLocationId],
  );
  const { settings } = useInquirySettings(firebase);
  const boardEnabled = settings.membershipsBoardEnabled;
  const boardStatuses = settings.membershipsBoardStatuses;
  const inquiryKind: AdminInquiryKind = "membership";
  const userId = typeof authUser?.uid === "string" ? authUser.uid : null;

  useEffect(() => {
    if (!userId) {
      setLastViewedAt(null);
      setReadIds(new Set<string>());
      setUnreadIds(new Set<string>());
      return;
    }
    const unsubscribe = onSnapshot(firebase.userRef(userId), (snapshot) => {
      const state = resolveAdminInquiryReadState(
        (snapshot.data()?.adminInquiryState as Record<string, unknown> | undefined)?.[
          inquiryKind
        ],
      );
      setLastViewedAt(state.lastViewedAt);
      setReadIds(state.readIds);
      setUnreadIds(state.unreadIds);
    });
    return () => {
      unsubscribe();
    };
  }, [firebase, inquiryKind, userId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "board" || stored === "table") {
        setViewMode(stored);
      }
      if (stored === "list") {
        setViewMode("table");
      }
    } catch (error) {
      console.warn("[MembershipInquiries] failed to read view-mode state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (error) {
      console.warn("[MembershipInquiries] failed to persist view-mode state", error);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!boardEnabled && viewMode === "board") {
      setViewMode("table");
    }
  }, [boardEnabled, viewMode]);

  const { inquiries, loading, error } = useMembershipInquiries(firebase, {
    refreshToken,
    includeArchived: showArchived,
  });

  const normalizedSearch = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);

  const startDateObj = useMemo(() => {
    if (!dateRange.start) return null;
    const d = new Date(dateRange.start);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateRange.start]);

  const endDateObj = useMemo(() => {
    if (!dateRange.end) return null;
    const d = new Date(dateRange.end);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange.end]);

  const filteredInquiries = useMemo(() => {
    if (!inquiries.length) return [];
    return inquiries.filter((inquiry) => {
      if (normalizedSearch) {
        const lookupTarget =
          `${inquiry.fullName} ${inquiry.recipientName} ${inquiry.email} ${inquiry.primaryLocation} ${inquiry.membershipType}`.toLowerCase();
        if (!lookupTarget.includes(normalizedSearch)) {
          return false;
        }
      }

      if (!matchesInquiryLocation(inquiry.primaryLocation, selectedLocation)) {
        return false;
      }
      if (
        !isAdminUser &&
        !matchesAllowedInquiryLocations(
          inquiry.primaryLocation,
          availableLocationOptions,
        )
      ) {
        return false;
      }

      const recordDate = resolveRecordDate(inquiry);
      if (startDateObj && recordDate && recordDate < startDateObj) {
        return false;
      }
      if (endDateObj && recordDate && recordDate > endDateObj) {
        return false;
      }

      if ((startDateObj || endDateObj) && !recordDate) {
        return false;
      }

      return true;
    });
  }, [
    inquiries,
    normalizedSearch,
    selectedLocation,
    startDateObj,
    endDateObj,
    isAdminUser,
    availableLocationOptions,
  ]);

  const latestInquiryDate = useMemo(() => {
    return inquiries.reduce<Date | null>((latest, inquiry) => {
      const currentDate = resolveRecordDate(inquiry);
      if (!currentDate) {
        return latest;
      }
      if (!latest || currentDate > latest) {
        return currentDate;
      }
      return latest;
    }, null);
  }, [inquiries]);

  const unreadInquiryIds = useMemo(() => {
    const unread = new Set<string>();
    if (!inquiries.length) {
      return unread;
    }

    const inquiryIdSet = new Set<string>();
    inquiries.forEach((inquiry) => {
      unread.add(inquiry.inquiryId);
      inquiryIdSet.add(inquiry.inquiryId);
    });

    inquiries.forEach((inquiry) => {
      const recordDate = resolveRecordDate(inquiry);
      if (recordDate && lastViewedAt && recordDate <= lastViewedAt) {
        unread.delete(inquiry.inquiryId);
      }
    });

    readIds.forEach((id) => unread.delete(id));
    unreadIds.forEach((id) => {
      if (inquiryIdSet.has(id)) {
        unread.add(id);
      }
    });

    return unread;
  }, [inquiries, lastViewedAt, readIds, unreadIds]);

  const boardItems = useMemo<InquiryBoardItem[]>(() => {
    return filteredInquiries.map((inquiry) => ({
      id: inquiry.inquiryId,
      title: inquiry.fullName || inquiry.recipientName || "Inquiry",
      subtitle: `${inquiry.primaryLocation || "—"} • ${inquiry.membershipType || "—"}`,
      meta: inquiry.referredBy ?? undefined,
      contact: inquiry.email,
      dateLabel: formatDateForDisplay(resolveRecordDate(inquiry)),
      dateValue: resolveRecordDate(inquiry),
      laneValues: {
        location: inquiry.primaryLocation || "—",
        source: inquiry.referredBy || "—",
      },
      unread: unreadInquiryIds.has(inquiry.inquiryId),
    }));
  }, [filteredInquiries, unreadInquiryIds]);

  const workflowState = useMemo(() => {
    return inquiries.reduce<Record<string, InquiryWorkflowEntry>>((acc, inquiry) => {
      acc[inquiry.inquiryId] = {
        assignedTo: inquiry.workflowAssignedTo ?? "",
        status: resolveWorkflowStatus(inquiry.workflowStatus, boardStatuses),
      };
      return acc;
    }, {});
  }, [inquiries, boardStatuses]);

  const hasUnread = unreadInquiryIds.size > 0;
  const isFilterActive = Boolean(
    searchTerm.trim() ||
      dateRange.start ||
      dateRange.end ||
      inquiryLocationId,
  );

  const selectedInquiry = useMemo(() => {
    if (!selectedInquiryId) {
      return null;
    }
    return inquiries.find((inquiry) => inquiry.inquiryId === selectedInquiryId) ?? null;
  }, [inquiries, selectedInquiryId]);

  const handleMarkInquiryRead = useCallback((inquiryId: string) => {
    if (!userId) return;
    setReadIds((prev) => new Set(prev).add(inquiryId));
    setUnreadIds((prev) => {
      if (!prev.has(inquiryId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(inquiryId);
      return next;
    });
    updateDoc(firebase.userRef(userId), {
      [`adminInquiryState.${inquiryKind}.readIds`]: arrayUnion(inquiryId),
      [`adminInquiryState.${inquiryKind}.unreadIds`]: arrayRemove(inquiryId),
    }).catch((error) => {
      console.error("[MembershipInquiries] failed to mark inquiry read", error);
    });
  }, [firebase, inquiryKind, userId]);

  const handleMarkInquiryUnread = useCallback((inquiryId: string) => {
    if (!userId) return;
    setUnreadIds((prev) => new Set(prev).add(inquiryId));
    setReadIds((prev) => {
      if (!prev.has(inquiryId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(inquiryId);
      return next;
    });
    updateDoc(firebase.userRef(userId), {
      [`adminInquiryState.${inquiryKind}.readIds`]: arrayRemove(inquiryId),
      [`adminInquiryState.${inquiryKind}.unreadIds`]: arrayUnion(inquiryId),
    }).catch((error) => {
      console.error("[MembershipInquiries] failed to mark inquiry unread", error);
    });
  }, [firebase, inquiryKind, userId]);

  const handleMarkAllViewed = useCallback(() => {
    if (!userId) return;
    const latest = latestInquiryDate ?? new Date();
    setLastViewedAt(latest);
    setReadIds(new Set<string>());
    setUnreadIds(new Set<string>());
    updateDoc(firebase.userRef(userId), {
      [`adminInquiryState.${inquiryKind}.lastViewedAt`]: latest.toISOString(),
      [`adminInquiryState.${inquiryKind}.readIds`]: [],
      [`adminInquiryState.${inquiryKind}.unreadIds`]: [],
    }).catch((error) => {
      console.error("[MembershipInquiries] failed to mark all read", error);
    });
  }, [firebase, inquiryKind, latestInquiryDate, userId]);

  const handleRetry = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
    if (!inquiryLocationId) {
      return;
    }
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("inquiryLocationId");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [inquiryLocationId, pathname, router, searchParams]);

  const handleLocationFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (value) {
        params.set("inquiryLocationId", value);
      } else {
        params.delete("inquiryLocationId");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const updateWorkflow = useCallback(
    async (
      inquiryId: string,
      updates: { status?: InquiryWorkflowStatus; assignedTo?: string },
    ) => {
      const inquiry = inquiries.find((item) => item.inquiryId === inquiryId);
      if (!inquiry) {
        console.warn("[MembershipInquiries] attempted to update missing inquiry", inquiryId);
        return;
      }
      const payload: Record<string, unknown> = {};
      if (updates.status) {
        payload.workflowStatus = updates.status;
      }
      if (typeof updates.assignedTo === "string") {
        payload.workflowAssignedTo = updates.assignedTo.trim();
      }

      try {
        await updateDoc(doc(firebase.membershipInquiriesRef(), inquiryId), payload);
      } catch (error) {
        console.error("[MembershipInquiries] failed to update workflow", error);
      }
    },
    [firebase, inquiries],
  );

  const handleStatusChange = useCallback(
    (inquiryId: string, status: InquiryWorkflowStatus) => {
      updateWorkflow(inquiryId, { status });
    },
    [updateWorkflow],
  );

  const handleMembershipPaidChange = useCallback(
    async (inquiryId: string, dateValue: string) => {
      try {
        await updateDoc(
          doc(firebase.membershipInquiriesRef(), inquiryId),
          { membershipPaidAt: dateValue ? dateValue : null },
        );
      } catch (error) {
        console.error("[MembershipInquiries] failed to update membership paid date", error);
      }
    },
    [firebase],
  );

  const handleMembershipExpiresChange = useCallback(
    async (inquiryId: string, dateValue: string) => {
      try {
        await updateDoc(
          doc(firebase.membershipInquiriesRef(), inquiryId),
          { membershipExpiresAt: dateValue ? dateValue : null },
        );
      } catch (error) {
        console.error("[MembershipInquiries] failed to update membership expires date", error);
      }
    },
    [firebase],
  );

  const handleArchiveInquiry = useCallback(
    async (inquiryId: string) => {
      if (!window.confirm("Archive this inquiry? It will be removed from the active lists.")) {
        return;
      }
      try {
        await updateDoc(
          doc(firebase.membershipInquiriesRef(), inquiryId),
          { archivedAt: new Date().toISOString() },
        );
        setSelectedInquiryId(null);
      } catch (error) {
        console.error("[MembershipInquiries] failed to archive", error);
      }
    },
    [firebase],
  );

  const handleConvertInquiry = useCallback(
    async (inquiryId: string) => {
      const inquiry = inquiries.find((item) => item.inquiryId === inquiryId);
      if (!inquiry) {
        return;
      }

      if (inquiry.convertedMemberId) {
        return;
      }

      if (!window.confirm("Convert this inquiry into a member record? The inquiry will be archived.")) {
        return;
      }

      const locationMatch = resolveInquiryLocation(inquiry.primaryLocation);

      try {
        const memberRef = await addDoc(firebase.membersRef(), {
          fullName: inquiry.fullName,
          recipientName: inquiry.recipientName,
          email: inquiry.email,
          phone: inquiry.phone,
          primaryLocation: inquiry.primaryLocation,
          primaryLocationId: locationMatch?.id ?? null,
          membershipType: inquiry.membershipType,
          referredBy: inquiry.referredBy ?? null,
          notes: inquiry.notes ?? null,
          membershipPaidAt: inquiry.membershipPaidAt ?? null,
          membershipExpiresAt: inquiry.membershipExpiresAt ?? null,
          inquiryId: inquiry.inquiryId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await updateDoc(
          doc(firebase.membershipInquiriesRef(), inquiryId),
          {
            archivedAt: new Date().toISOString(),
            convertedAt: new Date().toISOString(),
            convertedMemberId: memberRef.id,
          },
        );
        setSelectedInquiryId(null);
      } catch (error) {
        console.error("[MembershipInquiries] failed to convert inquiry", error);
      }
    },
    [firebase, inquiries, resolveInquiryLocation],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40">
        <div className="border-b border-white/10 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Membership Inquiries
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {loading
                  ? "Loading latest inquiries…"
                  : `${filteredInquiries.length} of ${inquiries.length} inquiries`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <span
                  className={clsx(
                    "inline-flex h-2 w-2 rounded-full",
                    hasUnread ? "bg-primary animate-pulse" : "bg-white/30",
                  )}
                />
                <span className="text-xs uppercase tracking-wide text-white/60">
                  {hasUnread ? "New submissions" : "All caught up"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleMarkAllViewed}
                disabled={!hasUnread}
                className={clsx(
                  "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                  hasUnread
                    ? "bg-primary text-white hover:bg-primary/80"
                    : "bg-white/10 text-white/50 cursor-not-allowed",
                )}
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className={clsx(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                  showArchived
                    ? "border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10"
                    : "border-white/20 text-white/70 hover:bg-white/10",
                )}
              >
                {showArchived ? "Hide archived" : "Show archived"}
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                    viewMode === "table"
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10",
                  )}
                >
                  Table view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (boardEnabled) {
                      setViewMode("board");
                    }
                  }}
                  disabled={!boardEnabled}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                    viewMode === "board"
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/10",
                    boardEnabled ? "" : "cursor-not-allowed text-white/40",
                  )}
                >
                  Board view
                </button>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
              Search
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or email"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
                From
                <input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end || undefined}
                  onChange={(event) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
                To
                <input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start || undefined}
                  onChange={(event) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
              Location
              <select
                value={inquiryLocationId}
                onChange={(event) => handleLocationFilterChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">All locations</option>
                {availableLocationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 md:justify-end">
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={!isFilterActive}
                className={clsx(
                  "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                  isFilterActive
                    ? "text-white hover:bg-white/10"
                    : "cursor-not-allowed text-white/40",
                )}
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {loading ? (
            <LoadingTablePlaceholder />
          ) : error ? (
            <ErrorState onRetry={handleRetry} error={error} />
          ) : filteredInquiries.length === 0 ? (
            <EmptyState hasFilters={isFilterActive} />
          ) : viewMode === "board" ? (
            boardStatuses.length ? (
        <InquiryBoard
          items={boardItems}
          workflowState={workflowState}
          onStatusChange={handleStatusChange}
          onAssigneeChange={() => {}}
          onMarkRead={handleMarkInquiryRead}
          allowedStatuses={boardStatuses}
          lane="status"
          renderControls={(item, entry) => {
            const inquiry =
              inquiries.find((candidate) => candidate.inquiryId === item.id) ?? null;
            return (
              <MembershipStatusControls
                inquiryId={item.id}
                entry={entry}
                onStatusChange={handleStatusChange}
                onPaidDateChange={handleMembershipPaidChange}
                onExpiresDateChange={handleMembershipExpiresChange}
                paidDateValue={formatDateForInput(inquiry?.membershipPaidAtDate)}
                expiresDateValue={formatDateForInput(inquiry?.membershipExpiresAtDate)}
                statuses={boardStatuses}
              />
            );
          }}
          showAssigneeMeta={false}
          onOpen={(inquiryId) => {
            setSelectedInquiryId(inquiryId);
            handleMarkInquiryRead(inquiryId);
          }}
        />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center text-sm text-white/60">
                No board columns are selected. Update Inquiry Settings to choose columns.
              </div>
            )
          ) : (
            <InquiryTable
              inquiries={filteredInquiries}
              selectedInquiryId={selectedInquiryId}
              onSelect={setSelectedInquiryId}
              unreadInquiryIds={unreadInquiryIds}
              onMarkRead={handleMarkInquiryRead}
              workflowState={workflowState}
              onStatusChange={handleStatusChange}
              onPaidDateChange={handleMembershipPaidChange}
              onExpiresDateChange={handleMembershipExpiresChange}
              boardStatuses={boardStatuses}
            />
          )}
        </div>
      </section>

      <InquiryDrawer
        inquiry={selectedInquiry}
        onClose={() => setSelectedInquiryId(null)}
        onMarkRead={handleMarkInquiryRead}
        onMarkUnread={handleMarkInquiryUnread}
        onArchive={handleArchiveInquiry}
        onConvert={handleConvertInquiry}
        isUnread={selectedInquiry ? unreadInquiryIds.has(selectedInquiry.inquiryId) : false}
        workflowState={workflowState}
        onStatusChange={handleStatusChange}
        onPaidDateChange={handleMembershipPaidChange}
        onExpiresDateChange={handleMembershipExpiresChange}
        boardStatuses={boardStatuses}
      />
    </div>
  );
}

function LoadingTablePlaceholder() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

type ErrorStateProps = {
  error: Error;
  onRetry: () => void;
};

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
        We couldn&apos;t load membership inquiries. {error.message}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary/80"
      >
        Retry
      </button>
    </div>
  );
}

type EmptyStateProps = {
  hasFilters: boolean;
};

function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center text-sm text-white/60">
      {hasFilters
        ? "No inquiries match the filters you have applied."
        : "No membership inquiries have been submitted yet."}
    </div>
  );
}

type InquiryTableProps = {
  inquiries: MembershipInquiry[];
  unreadInquiryIds: Set<string>;
  selectedInquiryId: string | null;
  onSelect: (inquiryId: string | null) => void;
  onMarkRead: (inquiryId: string) => void;
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onPaidDateChange: (inquiryId: string, dateValue: string) => void;
  onExpiresDateChange: (inquiryId: string, dateValue: string) => void;
  boardStatuses: string[];
};

function InquiryTable({
  inquiries,
  unreadInquiryIds,
  selectedInquiryId,
  onSelect,
  onMarkRead,
  workflowState,
  onStatusChange,
  onPaidDateChange,
  onExpiresDateChange,
  boardStatuses,
}: InquiryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
        <thead>
          <tr className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Membership</th>
            <th className="px-4 py-3 font-medium">Referral</th>
            <th className="px-4 py-3 font-medium">Membership</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {inquiries.map((inquiry) => {
            const recordDate = resolveRecordDate(inquiry);
            const isSelected = selectedInquiryId === inquiry.inquiryId;
            const isUnread = unreadInquiryIds.has(inquiry.inquiryId);

            return (
              <tr
                key={inquiry.inquiryId}
                className={clsx(
                  "cursor-pointer transition",
                  isSelected ? "bg-primary/15" : "hover:bg-white/5",
                )}
                onClick={() => {
                  onSelect(isSelected ? null : inquiry.inquiryId);
                  onMarkRead(inquiry.inquiryId);
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {inquiry.fullName || inquiry.recipientName || "Inquiry"}
                    </span>
                    {isUnread ? (
                      <span className="rounded-full bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {inquiry.recipientName ? `Recipient: ${inquiry.recipientName}` : "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{inquiry.email}</p>
                  <p className="text-xs text-white/60">{formatPhone(inquiry.phone)}</p>
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.primaryLocation || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.membershipType || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.referredBy || "—"}
                </td>
                <td className="px-4 py-3">
                  <MembershipStatusControls
                    inquiryId={inquiry.inquiryId}
                    entry={
                      workflowState[inquiry.inquiryId] ?? {
                        assignedTo: "",
                        status: DEFAULT_WORKFLOW_STATUS,
                      }
                    }
                    onStatusChange={onStatusChange}
                    onPaidDateChange={onPaidDateChange}
                    onExpiresDateChange={onExpiresDateChange}
                    paidDateValue={formatDateForInput(inquiry.membershipPaidAtDate)}
                    expiresDateValue={formatDateForInput(inquiry.membershipExpiresAtDate)}
                    statuses={boardStatuses}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  <span title={inquiry.createdAtDate?.toISOString()}>
                    {formatDateForDisplay(recordDate)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
