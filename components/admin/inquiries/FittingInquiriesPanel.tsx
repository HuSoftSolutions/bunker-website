"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import type Firebase from "@/lib/firebase/client";
import { useFittingsInquiries, type FittingsInquiry } from "@/hooks/useFittingsInquiries";
import { useInquirySettings } from "@/hooks/useInquirySettings";
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
  InquiryBoard,
  type InquiryBoardItem,
} from "./InquiryBoard";
import { WorkflowControls } from "./WorkflowControls";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";

const VIEW_MODE_STORAGE_KEY = "admin-fitting-inquiries-view-mode";

type DateRange = {
  start: string;
  end: string;
};

type ViewMode = "table" | "board";

function resolveRecordDate(inquiry: FittingsInquiry) {
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
    console.warn("[FittingInquiries] failed to format date", error);
    return dateValue.toLocaleString();
  }
}

type InquiryDrawerProps = {
  inquiry: FittingsInquiry | null;
  onClose: () => void;
  onMarkRead: (inquiryId: string) => void;
  onMarkUnread: (inquiryId: string) => void;
  onArchive: (inquiryId: string) => void;
  isUnread: boolean;
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onAssigneeChange: (inquiryId: string, assignee: string) => void;
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

function InquiryDrawer({
  inquiry,
  onClose,
  onMarkRead,
  onMarkUnread,
  onArchive,
  isUnread,
  workflowState,
  onStatusChange,
  onAssigneeChange,
  boardStatuses,
}: InquiryDrawerProps) {
  if (!inquiry) return null;

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
              Fitting Inquiry
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white">
              {inquiry.name || "Inquiry"}
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
          <WorkflowControls
            inquiryId={inquiry.inquiryId}
            entry={workflowEntry}
            onStatusChange={onStatusChange}
            onAssigneeChange={onAssigneeChange}
            layout="inline"
            statuses={boardStatuses}
          />
          <p className="mt-2 text-xs uppercase tracking-wide text-white/50">
            Current owner: {workflowEntry.assignedTo || "Unassigned"}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <DrawerField label="Inquiry ID">{inquiry.inquiryId}</DrawerField>
          <DrawerField label="Interest">{inquiry.fittingInterest || "—"}</DrawerField>
          <DrawerField label="Location Preference">{inquiry.locationPreference || "—"}</DrawerField>
          <DrawerField label="Time Preference">{inquiry.timePreference || "—"}</DrawerField>
          <DrawerField label="Email">
            <a
              href={`mailto:${inquiry.email}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {inquiry.email}
            </a>
          </DrawerField>
          <DrawerField label="Phone">
            <a
              href={`tel:${inquiry.phone}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {formatPhone(inquiry.phone)}
            </a>
          </DrawerField>
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

type FittingInquiriesPanelProps = {
  firebase: Firebase;
};

export function FittingInquiriesPanel({ firebase }: FittingInquiriesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set<string>());
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set<string>());
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const { settings } = useInquirySettings(firebase);
  const boardEnabled = settings.fittingsBoardEnabled;
  const boardStatuses = settings.fittingsBoardStatuses;
  const { authUser } = useAuth();
  const inquiryKind: AdminInquiryKind = "fitting";
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
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "board" || stored === "table") {
        setViewMode(stored);
      }
      if (stored === "list") {
        setViewMode("table");
      }
    } catch (error) {
      console.warn("[FittingInquiries] failed to read view-mode state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (error) {
      console.warn("[FittingInquiries] failed to persist view-mode state", error);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!boardEnabled && viewMode === "board") {
      setViewMode("table");
    }
  }, [boardEnabled, viewMode]);

  const { inquiries, loading, error } = useFittingsInquiries(firebase, { refreshToken });

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
          `${inquiry.name} ${inquiry.email} ${inquiry.fittingInterest} ${inquiry.locationPreference}`.toLowerCase();
        if (!lookupTarget.includes(normalizedSearch)) {
          return false;
        }
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
  }, [inquiries, normalizedSearch, startDateObj, endDateObj]);

  const latestInquiryDate = useMemo(() => {
    return inquiries.reduce<Date | null>((latest, inquiry) => {
      const currentDate = resolveRecordDate(inquiry);
      if (!currentDate) return latest;
      if (!latest || currentDate > latest) return currentDate;
      return latest;
    }, null);
  }, [inquiries]);

  const unreadInquiryIds = useMemo(() => {
    const unread = new Set<string>();
    if (!inquiries.length) return unread;

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
      title: inquiry.name || "Inquiry",
      subtitle: inquiry.fittingInterest || "—",
      meta: `${inquiry.locationPreference || "—"} • ${inquiry.timePreference || "—"}`,
      contact: inquiry.email,
      dateLabel: formatDateForDisplay(resolveRecordDate(inquiry)),
      dateValue: resolveRecordDate(inquiry),
      laneValues: {
        location: inquiry.locationPreference || "—",
        source: inquiry.fittingInterest || "—",
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
  const isFilterActive = Boolean(searchTerm.trim() || dateRange.start || dateRange.end);

  const selectedInquiry = useMemo(() => {
    if (!selectedInquiryId) return null;
    return inquiries.find((inquiry) => inquiry.inquiryId === selectedInquiryId) ?? null;
  }, [inquiries, selectedInquiryId]);

  const handleMarkInquiryRead = useCallback((inquiryId: string) => {
    if (!userId) return;
    setReadIds((prev) => new Set(prev).add(inquiryId));
    setUnreadIds((prev) => {
      if (!prev.has(inquiryId)) return prev;
      const next = new Set(prev);
      next.delete(inquiryId);
      return next;
    });
    updateDoc(firebase.userRef(userId), {
      [`adminInquiryState.${inquiryKind}.readIds`]: arrayUnion(inquiryId),
      [`adminInquiryState.${inquiryKind}.unreadIds`]: arrayRemove(inquiryId),
    }).catch((error) => {
      console.error("[FittingInquiries] failed to mark inquiry read", error);
    });
  }, [firebase, inquiryKind, userId]);

  const handleMarkInquiryUnread = useCallback((inquiryId: string) => {
    if (!userId) return;
    setUnreadIds((prev) => new Set(prev).add(inquiryId));
    setReadIds((prev) => {
      if (!prev.has(inquiryId)) return prev;
      const next = new Set(prev);
      next.delete(inquiryId);
      return next;
    });
    updateDoc(firebase.userRef(userId), {
      [`adminInquiryState.${inquiryKind}.readIds`]: arrayRemove(inquiryId),
      [`adminInquiryState.${inquiryKind}.unreadIds`]: arrayUnion(inquiryId),
    }).catch((error) => {
      console.error("[FittingInquiries] failed to mark inquiry unread", error);
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
      console.error("[FittingInquiries] failed to mark all read", error);
    });
  }, [firebase, inquiryKind, latestInquiryDate, userId]);

  const handleRetry = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange({ start: "", end: "" });
  }, []);

  const updateWorkflow = useCallback(
    async (
      inquiryId: string,
      updates: { status?: InquiryWorkflowStatus; assignedTo?: string },
    ) => {
      const inquiry = inquiries.find((item) => item.inquiryId === inquiryId);
      if (!inquiry) {
        console.warn("[FittingInquiries] attempted to update missing inquiry", inquiryId);
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
        await updateDoc(doc(firebase.fittingsInquiriesRef(), inquiryId), payload);
      } catch (error) {
        console.error("[FittingInquiries] failed to update workflow", error);
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

  const handleAssigneeChange = useCallback(
    (inquiryId: string, assignee: string) => {
      updateWorkflow(inquiryId, { assignedTo: assignee });
    },
    [updateWorkflow],
  );

  const handleArchiveInquiry = useCallback(
    async (inquiryId: string) => {
      if (!window.confirm("Archive this inquiry? It will be removed from the active lists.")) {
        return;
      }
      try {
        await updateDoc(
          doc(firebase.fittingsInquiriesRef(), inquiryId),
          { archivedAt: new Date().toISOString() },
        );
        setSelectedInquiryId(null);
      } catch (error) {
        console.error("[FittingInquiries] failed to archive", error);
      }
    },
    [firebase],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40">
        <div className="border-b border-white/10 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Fitting Inquiries
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
          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
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
                onAssigneeChange={handleAssigneeChange}
                onMarkRead={handleMarkInquiryRead}
                allowedStatuses={boardStatuses}
                lane="status"
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
              onAssigneeChange={handleAssigneeChange}
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
        isUnread={selectedInquiry ? unreadInquiryIds.has(selectedInquiry.inquiryId) : false}
        workflowState={workflowState}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
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
        We couldn&apos;t load fitting inquiries. {error.message}
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
        : "No fitting inquiries have been submitted yet."}
    </div>
  );
}

type InquiryTableProps = {
  inquiries: FittingsInquiry[];
  unreadInquiryIds: Set<string>;
  selectedInquiryId: string | null;
  onSelect: (inquiryId: string | null) => void;
  onMarkRead: (inquiryId: string) => void;
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onAssigneeChange: (inquiryId: string, assignee: string) => void;
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
  onAssigneeChange,
  boardStatuses,
}: InquiryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
        <thead>
          <tr className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Interest</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 font-medium">Workflow</th>
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
                      {inquiry.name || "Inquiry"}
                    </span>
                    {isUnread ? (
                      <span className="rounded-full bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{inquiry.email}</p>
                  <p className="text-xs text-white/60">{formatPhone(inquiry.phone)}</p>
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.fittingInterest || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.locationPreference || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.timePreference || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-white/70">
                  {inquiry.notes ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <WorkflowControls
                    inquiryId={inquiry.inquiryId}
                    entry={
                      workflowState[inquiry.inquiryId] ?? {
                        assignedTo: "",
                        status: DEFAULT_WORKFLOW_STATUS,
                      }
                    }
                    onStatusChange={onStatusChange}
                    onAssigneeChange={onAssigneeChange}
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
