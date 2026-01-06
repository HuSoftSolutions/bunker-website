"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { format } from "date-fns";
import type Firebase from "@/lib/firebase/client";
import { useFranchiseInquiries, type FranchiseInquiry } from "@/hooks/useFranchiseInquiries";
import { useInquirySettings } from "@/hooks/useInquirySettings";
import {
  DEFAULT_WORKFLOW_STATUS,
  type InquiryWorkflowEntry,
  type InquiryWorkflowStatus,
  resolveWorkflowStatus,
} from "@/utils/inquiryWorkflow";
import { formatPhone } from "@/utils/format";
import { emitAdminInquiryReadStateChanged } from "@/utils/adminReadState";
import {
  InquiryBoard,
  type InquiryBoardItem,
} from "./InquiryBoard";
import { WorkflowControls } from "./WorkflowControls";
import { doc, updateDoc } from "firebase/firestore";

const LAST_VIEWED_STORAGE_KEY = "admin-franchise-inquiries-last-viewed";
const READ_IDS_STORAGE_KEY = "admin-franchise-inquiries-read-ids";
const VIEW_MODE_STORAGE_KEY = "admin-franchise-inquiries-view-mode";

type DateRange = {
  start: string;
  end: string;
};

type ViewMode = "table" | "board";

function resolveRecordDate(inquiry: FranchiseInquiry) {
  const candidate = inquiry.submittedAtDate ?? inquiry.createdAtDate ?? null;
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
    console.warn("[FranchiseInquiries] failed to format date", error);
    return dateValue.toLocaleString();
  }
}

function normalizeLinkedInUrl(link?: string | null) {
  if (!link) {
    return null;
  }
  if (/^https?:\/\//i.test(link)) {
    return link;
  }
  return `https://${link}`;
}

type FranchiseInquiriesPanelProps = {
  firebase: Firebase;
};

export function FranchiseInquiriesPanel({ firebase }: FranchiseInquiriesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set<string>());
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const { settings } = useInquirySettings(firebase);
  const boardEnabled = settings.franchiseBoardEnabled;
  const boardStatuses = settings.franchiseBoardStatuses;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
      if (stored) {
        const parsed = new Date(stored);
        if (!Number.isNaN(parsed.getTime())) {
          setLastViewedAt(parsed);
        }
      }
    } catch (error) {
      console.warn("[FranchiseInquiries] failed to read last-viewed state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(READ_IDS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const next = new Set<string>();
          parsed.forEach((id) => {
            if (typeof id === "string" && id) {
              next.add(id);
            }
          });
          setReadIds(next);
        }
      }
    } catch (error) {
      console.warn("[FranchiseInquiries] failed to read read-ids state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      if (readIds.size) {
        window.localStorage.setItem(
          READ_IDS_STORAGE_KEY,
          JSON.stringify(Array.from(readIds)),
        );
      } else {
        window.localStorage.removeItem(READ_IDS_STORAGE_KEY);
      }
      emitAdminInquiryReadStateChanged("franchise");
    } catch (error) {
      console.warn("[FranchiseInquiries] failed to persist read-ids state", error);
    }
  }, [readIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "board" || stored === "table") {
        setViewMode(stored);
      }
    } catch (error) {
      console.warn("[FranchiseInquiries] failed to read view-mode state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (error) {
      console.warn("[FranchiseInquiries] failed to persist view-mode state", error);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!boardEnabled && viewMode === "board") {
      setViewMode("table");
    }
  }, [boardEnabled, viewMode]);

  const { inquiries, loading, error } = useFranchiseInquiries(firebase, { refreshToken });

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
        const lookupTarget = `${inquiry.firstName} ${inquiry.lastName} ${inquiry.email}`.toLowerCase();
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

  const selectedInquiry = useMemo(() => {
    if (!selectedInquiryId) {
      return null;
    }
    return inquiries.find((inquiry) => inquiry.inquiryId === selectedInquiryId) ?? null;
  }, [inquiries, selectedInquiryId]);

  const mostRecentDate = useMemo(() => {
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

    inquiries.forEach((inquiry) => {
      unread.add(inquiry.inquiryId);
    });

    inquiries.forEach((inquiry) => {
      const recordDate = resolveRecordDate(inquiry);
      if (recordDate && lastViewedAt && recordDate <= lastViewedAt) {
        unread.delete(inquiry.inquiryId);
      }
    });

    readIds.forEach((id) => unread.delete(id));

    return unread;
  }, [inquiries, lastViewedAt, readIds]);

  const boardItems = useMemo<InquiryBoardItem[]>(() => {
    return filteredInquiries.map((inquiry) => {
      const locationLabel = [inquiry.city, inquiry.country].filter(Boolean).join(", ");
      const locationValue = locationLabel || inquiry.targetGeography || "—";
      return {
        id: inquiry.inquiryId,
        title: `${inquiry.firstName} ${inquiry.lastName}`,
        subtitle: inquiry.franchiseSite ?? "franchise-website",
        meta: `${inquiry.city}, ${inquiry.country}`,
        contact: inquiry.email,
        dateLabel: formatDateForDisplay(resolveRecordDate(inquiry)),
        dateValue: resolveRecordDate(inquiry),
        laneValues: {
          location: locationValue,
          source: inquiry.referral ?? "—",
        },
        unread: unreadInquiryIds.has(inquiry.inquiryId),
      };
    });
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

  const handleRetry = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const handleMarkInquiryRead = useCallback((inquiryId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(inquiryId);
      return next;
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    const referenceDate = mostRecentDate ?? new Date();
    try {
      window.localStorage.setItem(
        LAST_VIEWED_STORAGE_KEY,
        referenceDate.toISOString(),
      );
      emitAdminInquiryReadStateChanged("franchise");
    } catch (storageError) {
      console.warn("[FranchiseInquiries] failed to mark as read", storageError);
    }
    setLastViewedAt(referenceDate);
    setReadIds(new Set<string>());
  }, [mostRecentDate]);

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
        console.warn("[FranchiseInquiries] attempted to update missing inquiry", inquiryId);
        return;
      }
      const franchiseSite = inquiry.franchiseSite ?? "franchise-website";
      const payload: Record<string, unknown> = {};
      if (updates.status) {
        payload.workflowStatus = updates.status;
      }
      if (typeof updates.assignedTo === "string") {
        payload.workflowAssignedTo = updates.assignedTo.trim();
      }

      try {
        await updateDoc(
          doc(firebase.franchiseInquiriesRef(franchiseSite), inquiryId),
          payload,
        );
      } catch (error) {
        console.error("[FranchiseInquiries] failed to update workflow", error);
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
      const inquiry = inquiries.find((item) => item.inquiryId === inquiryId);
      if (!inquiry) {
        return;
      }
      if (!window.confirm("Archive this inquiry? It will be removed from the active lists.")) {
        return;
      }
      const franchiseSite = inquiry.franchiseSite ?? "franchise-website";
      try {
        await updateDoc(
          doc(firebase.franchiseInquiriesRef(franchiseSite), inquiryId),
          { archivedAt: new Date().toISOString() },
        );
        setSelectedInquiryId(null);
      } catch (error) {
        console.error("[FranchiseInquiries] failed to archive", error);
      }
    },
    [firebase, inquiries],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40">
        <div className="border-b border-white/10 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
                Franchise Inquiries
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
                onClick={handleMarkAllRead}
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
        isUnread={selectedInquiry ? unreadInquiryIds.has(selectedInquiry.inquiryId) : false}
        onMarkRead={handleMarkInquiryRead}
        onArchive={handleArchiveInquiry}
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
        We couldn&apos;t load franchise inquiries. {error.message}
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
        : "No franchise inquiries have been submitted yet."}
    </div>
  );
}

type InquiryTableProps = {
  inquiries: FranchiseInquiry[];
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
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Focus</th>
            <th className="px-4 py-3 font-medium">Referral</th>
            <th className="px-4 py-3 font-medium">Workflow</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {inquiries.map((inquiry) => {
            const recordDate = resolveRecordDate(inquiry);
            const linkedinUrl = normalizeLinkedInUrl(inquiry.linkedin);
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
                      {inquiry.firstName} {inquiry.lastName}
                    </span>
                    {isUnread ? (
                      <span className="rounded-full bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {inquiry.franchiseSite ?? "franchise-website"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{inquiry.email}</p>
                  <p className="text-xs text-white/60">{formatPhone(inquiry.phone)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">
                    {inquiry.city}, {inquiry.country}
                  </p>
                  <p className="text-xs text-white/60">
                    {inquiry.targetGeography ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-white">{inquiry.targetGeography ?? "—"}</p>
                  {linkedinUrl ? (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-xs text-primary underline-offset-4 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      LinkedIn
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-white/40">No LinkedIn</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {inquiry.referral ?? "—"}
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
                  <span title={inquiry.submittedAt ?? undefined}>
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

type InquiryDrawerProps = {
  inquiry: FranchiseInquiry | null;
  onClose: () => void;
  onMarkRead: (inquiryId: string) => void;
  onArchive: (inquiryId: string) => void;
  isUnread: boolean;
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onAssigneeChange: (inquiryId: string, assignee: string) => void;
  boardStatuses: string[];
};

function InquiryDrawer({
  inquiry,
  onClose,
  onMarkRead,
  onArchive,
  isUnread,
  workflowState,
  onStatusChange,
  onAssigneeChange,
  boardStatuses,
}: InquiryDrawerProps) {
  if (!inquiry) {
    return null;
  }

  const submittedDisplay = formatDateForDisplay(resolveRecordDate(inquiry));
  const linkedinUrl = normalizeLinkedInUrl(inquiry.linkedin);
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
              Inquiry
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white">
              {inquiry.firstName} {inquiry.lastName}
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
            ) : null}
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
          <DrawerField label="Franchise Site">{inquiry.franchiseSite ?? "—"}</DrawerField>
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
          <DrawerField label="City/Country">
            {inquiry.city}, {inquiry.country}
          </DrawerField>
          <DrawerField label="Target Geography">{inquiry.targetGeography ?? "—"}</DrawerField>
          <DrawerField label="Referral">{inquiry.referral ?? "—"}</DrawerField>
          <DrawerField label="LinkedIn">
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {inquiry.linkedin}
              </a>
            ) : (
              <span className="text-white/60">—</span>
            )}
          </DrawerField>
          <DrawerField label="Submitted">
            <span title={inquiry.submittedAt ?? undefined}>{submittedDisplay}</span>
          </DrawerField>
        </div>
      </div>
    </div>
  );
}

function DrawerField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </p>
      <div className="mt-1 text-sm text-white">{children}</div>
    </div>
  );
}
