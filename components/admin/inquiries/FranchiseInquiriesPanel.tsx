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
import { formatPhone } from "@/utils/format";
import { emitAdminInquiryReadStateChanged } from "@/utils/adminReadState";

const LAST_VIEWED_STORAGE_KEY = "admin-franchise-inquiries-last-viewed";
const READ_IDS_STORAGE_KEY = "admin-franchise-inquiries-read-ids";

type DateRange = {
  start: string;
  end: string;
};

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

  const emailNotificationAlert = (
    <div className="rounded-2xl border border-primary/40 bg-primary/15 px-4 py-3 text-sm text-primary/90">
      Franchise inquiries continue to trigger the Firebase Functions + SendGrid
      notification workflow. Update the <span className="font-semibold">franchise config email</span>{" "}
      doc if recipients need to change.
    </div>
  );

  return (
    <div className="space-y-6">
      {emailNotificationAlert}

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
          ) : (
            <InquiryTable
              inquiries={filteredInquiries}
              selectedInquiryId={selectedInquiryId}
              onSelect={setSelectedInquiryId}
              unreadInquiryIds={unreadInquiryIds}
              onMarkRead={handleMarkInquiryRead}
            />
          )}
        </div>
      </section>

      <InquiryDrawer
        inquiry={selectedInquiry}
        onClose={() => setSelectedInquiryId(null)}
        isUnread={selectedInquiry ? unreadInquiryIds.has(selectedInquiry.inquiryId) : false}
        onMarkRead={handleMarkInquiryRead}
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
};

function InquiryTable({
  inquiries,
  unreadInquiryIds,
  selectedInquiryId,
  onSelect,
  onMarkRead,
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
  isUnread: boolean;
};

function InquiryDrawer({ inquiry, onClose, onMarkRead, isUnread }: InquiryDrawerProps) {
  if (!inquiry) {
    return null;
  }

  const submittedDisplay = formatDateForDisplay(resolveRecordDate(inquiry));
  const linkedinUrl = normalizeLinkedInUrl(inquiry.linkedin);

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
              onClick={onClose}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
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
