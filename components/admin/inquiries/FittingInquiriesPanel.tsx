"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import type Firebase from "@/lib/firebase/client";
import { useFittingsInquiries, type FittingsInquiry } from "@/hooks/useFittingsInquiries";
import { formatPhone } from "@/utils/format";
import { emitAdminInquiryReadStateChanged } from "@/utils/adminReadState";

const LAST_VIEWED_STORAGE_KEY = "admin-fitting-inquiries-last-viewed";
const READ_IDS_STORAGE_KEY = "admin-fitting-inquiries-read-ids";

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
  isUnread: boolean;
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

function InquiryDrawer({ inquiry, onClose, onMarkRead, isUnread }: InquiryDrawerProps) {
  if (!inquiry) return null;

  const submittedDisplay = formatDateForDisplay(resolveRecordDate(inquiry));

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
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
      if (stored) {
        const parsed = new Date(stored);
        if (!Number.isNaN(parsed.getTime())) setLastViewedAt(parsed);
      }
    } catch (error) {
      console.warn("[FittingInquiries] failed to read last-viewed state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(READ_IDS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const next = new Set<string>();
          parsed.forEach((id) => {
            if (typeof id === "string" && id) next.add(id);
          });
          setReadIds(next);
        }
      }
    } catch (error) {
      console.warn("[FittingInquiries] failed to read read-ids state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (readIds.size) {
        window.localStorage.setItem(
          READ_IDS_STORAGE_KEY,
          JSON.stringify(Array.from(readIds)),
        );
      } else {
        window.localStorage.removeItem(READ_IDS_STORAGE_KEY);
      }
      emitAdminInquiryReadStateChanged("fitting");
    } catch (error) {
      console.warn("[FittingInquiries] failed to persist read-ids state", error);
    }
  }, [readIds]);

  const { inquiries, loading, error } = useFittingsInquiries(firebase);

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

    inquiries.forEach((inquiry) => unread.add(inquiry.inquiryId));

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

  const selectedInquiry = useMemo(() => {
    if (!selectedInquiryId) return null;
    return inquiries.find((inquiry) => inquiry.inquiryId === selectedInquiryId) ?? null;
  }, [inquiries, selectedInquiryId]);

  const handleMarkInquiryRead = useCallback((inquiryId: string) => {
    setReadIds((prev) => new Set(prev).add(inquiryId));
  }, []);

  const handleMarkAllViewed = useCallback(() => {
    const latest = latestInquiryDate ?? new Date();
    setLastViewedAt(latest);
    try {
      window.localStorage.setItem(LAST_VIEWED_STORAGE_KEY, latest.toISOString());
      emitAdminInquiryReadStateChanged("fitting");
    } catch (error) {
      console.warn("[FittingInquiries] failed to persist last-viewed state", error);
    }
  }, [latestInquiryDate]);

  return (
    <>
      {error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-6 text-red-200">
          We couldn&apos;t load fitting inquiries. {error.message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-black/40 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-white">
            {loading ? "Loading…" : `${inquiries.length} inquiries`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMarkAllViewed}
              className={clsx(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                hasUnread
                  ? "border-primary/50 text-primary hover:bg-primary/10"
                  : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white",
              )}
              disabled={!inquiries.length}
            >
              Mark All Viewed
            </button>
            {hasUnread ? (
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {unreadInquiryIds.size} new
              </span>
            ) : (
              <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                Up to date
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {inquiries.length ? (
            inquiries.map((inquiry) => {
              const isSelected = selectedInquiryId === inquiry.inquiryId;
              const isUnread = unreadInquiryIds.has(inquiry.inquiryId);
              const recordDate = resolveRecordDate(inquiry);
              return (
                <button
                  key={inquiry.inquiryId}
                  type="button"
                  className={clsx(
                    "flex w-full items-start justify-between gap-4 px-6 py-4 text-left transition",
                    isSelected ? "bg-primary/10" : "hover:bg-white/5",
                  )}
                  onClick={() => {
                    setSelectedInquiryId(inquiry.inquiryId);
                    handleMarkInquiryRead(inquiry.inquiryId);
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{inquiry.name || "Inquiry"}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
                      {inquiry.fittingInterest || "—"} • {inquiry.locationPreference || "—"}
                    </p>
                    <p className="mt-2 text-xs text-white/60">{inquiry.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-white/50">
                      {formatDateForDisplay(recordDate)}
                    </p>
                    {isUnread ? (
                      <span className="rounded-full bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-10 text-center text-sm text-white/60">
              {loading ? "Loading inquiries…" : "No fitting inquiries have been submitted yet."}
            </div>
          )}
        </div>
      </div>

      <InquiryDrawer
        inquiry={selectedInquiry}
        onClose={() => setSelectedInquiryId(null)}
        onMarkRead={handleMarkInquiryRead}
        isUnread={selectedInquiry ? unreadInquiryIds.has(selectedInquiry.inquiryId) : false}
      />
    </>
  );
}

