"use client";

import { useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { WORKFLOW_STATUSES } from "@/utils/inquiryWorkflow";

type InquirySettingsFormState = {
  franchiseDefaultRecipients: string;
  careersDefaultRecipients: string;
  lessonsDefaultRecipients: string;
  leaguesDefaultRecipients: string;
  fittingsDefaultRecipients: string;
  membershipsDefaultRecipients: string;
  eventsDefaultRecipients: string;
  franchiseSendEmails: boolean;
  careersSendEmails: boolean;
  lessonsSendEmails: boolean;
  leaguesSendEmails: boolean;
  fittingsSendEmails: boolean;
  membershipsSendEmails: boolean;
  eventsSendEmails: boolean;
  franchiseBoardEnabled: boolean;
  careersBoardEnabled: boolean;
  lessonsBoardEnabled: boolean;
  leaguesBoardEnabled: boolean;
  fittingsBoardEnabled: boolean;
  membershipsBoardEnabled: boolean;
  eventsBoardEnabled: boolean;
  franchiseBoardStatuses: string[];
  careersBoardStatuses: string[];
  lessonsBoardStatuses: string[];
  leaguesBoardStatuses: string[];
  fittingsBoardStatuses: string[];
  membershipsBoardStatuses: string[];
  eventsBoardStatuses: string[];
};

const DEFAULT_STATE: InquirySettingsFormState = {
  franchiseDefaultRecipients: "franchise@getinthebunker.golf",
  careersDefaultRecipients: "careers@getinthebunker.golf",
  lessonsDefaultRecipients: "lessons@getinthebunker.golf",
  leaguesDefaultRecipients: "leagues@getinthebunker.golf",
  fittingsDefaultRecipients: "fittings@getinthebunker.golf",
  membershipsDefaultRecipients: "memberships@getinthebunker.golf",
  eventsDefaultRecipients: "events@getinthebunker.golf",
  franchiseSendEmails: true,
  careersSendEmails: true,
  lessonsSendEmails: true,
  leaguesSendEmails: true,
  fittingsSendEmails: true,
  membershipsSendEmails: true,
  eventsSendEmails: true,
  franchiseBoardEnabled: true,
  careersBoardEnabled: true,
  lessonsBoardEnabled: true,
  leaguesBoardEnabled: true,
  fittingsBoardEnabled: true,
  membershipsBoardEnabled: true,
  eventsBoardEnabled: true,
  franchiseBoardStatuses: [...WORKFLOW_STATUSES],
  careersBoardStatuses: [...WORKFLOW_STATUSES],
  lessonsBoardStatuses: [...WORKFLOW_STATUSES],
  leaguesBoardStatuses: [...WORKFLOW_STATUSES],
  fittingsBoardStatuses: [...WORKFLOW_STATUSES],
  membershipsBoardStatuses: [...WORKFLOW_STATUSES],
  eventsBoardStatuses: [...WORKFLOW_STATUSES],
};

type InquiryTabKey =
  | "franchise"
  | "careers"
  | "lessons"
  | "leagues"
  | "fittings"
  | "memberships";
type InquiryFormKey = keyof InquirySettingsFormState;

const INQUIRY_TABS: readonly {
  key: InquiryTabKey;
  label: string;
  description: string;
  recipientsKey: InquiryFormKey;
  sendEmailsKey: InquiryFormKey;
  boardEnabledKey: InquiryFormKey;
  boardStatusesKey: InquiryFormKey;
  sendLabel: string;
  placeholder: string;
}[] = [
  {
    key: "franchise",
    label: "Franchise",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "franchiseDefaultRecipients",
    sendEmailsKey: "franchiseSendEmails",
    boardEnabledKey: "franchiseBoardEnabled",
    boardStatusesKey: "franchiseBoardStatuses",
    sendLabel: "Send emails for franchise inquiries",
    placeholder: "franchise@getinthebunker.golf",
  },
  {
    key: "careers",
    label: "Careers",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "careersDefaultRecipients",
    sendEmailsKey: "careersSendEmails",
    boardEnabledKey: "careersBoardEnabled",
    boardStatusesKey: "careersBoardStatuses",
    sendLabel: "Send emails for career inquiries",
    placeholder: "careers@getinthebunker.golf",
  },
  {
    key: "lessons",
    label: "Lessons",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "lessonsDefaultRecipients",
    sendEmailsKey: "lessonsSendEmails",
    boardEnabledKey: "lessonsBoardEnabled",
    boardStatusesKey: "lessonsBoardStatuses",
    sendLabel: "Send emails for lesson inquiries",
    placeholder: "lessons@getinthebunker.golf",
  },
  {
    key: "leagues",
    label: "Leagues",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "leaguesDefaultRecipients",
    sendEmailsKey: "leaguesSendEmails",
    boardEnabledKey: "leaguesBoardEnabled",
    boardStatusesKey: "leaguesBoardStatuses",
    sendLabel: "Send emails for league inquiries",
    placeholder: "leagues@getinthebunker.golf",
  },
  {
    key: "fittings",
    label: "Fittings",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "fittingsDefaultRecipients",
    sendEmailsKey: "fittingsSendEmails",
    boardEnabledKey: "fittingsBoardEnabled",
    boardStatusesKey: "fittingsBoardStatuses",
    sendLabel: "Send emails for fitting inquiries",
    placeholder: "fittings@getinthebunker.golf",
  },
  {
    key: "memberships",
    label: "Memberships",
    description: "Comma or newline separated list of recipient emails.",
    recipientsKey: "membershipsDefaultRecipients",
    sendEmailsKey: "membershipsSendEmails",
    boardEnabledKey: "membershipsBoardEnabled",
    boardStatusesKey: "membershipsBoardStatuses",
    sendLabel: "Send emails for membership inquiries",
    placeholder: "memberships@getinthebunker.golf",
  },
];

function normalizeEmails(value: string) {
  const parts = value
    .split(/[,\n]/g)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const uniq = new Set(parts);
  return Array.from(uniq);
}

function normalizeStatusSelection(value: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  value.forEach((status) => {
    const trimmed = status.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
}

function resolveBoardStatuses(value: unknown, fallback: string[]) {
  if (value !== undefined && value !== null) {
    const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return normalizeStatusSelection(list);
  }
  return fallback;
}

type InquirySettingsPanelProps = {
  firebase: Firebase;
};

export function InquirySettingsPanel({ firebase }: InquirySettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<InquiryTabKey>(INQUIRY_TABS[0].key);
  const [form, setForm] = useState<InquirySettingsFormState>(DEFAULT_STATE);
  const [initial, setInitial] = useState<InquirySettingsFormState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [draggedStatusIndex, setDraggedStatusIndex] = useState<number | null>(null);

  const activeConfig =
    INQUIRY_TABS.find((tab) => tab.key === activeTab) ?? INQUIRY_TABS[0];

  const sendEmailsValue = form[activeConfig.sendEmailsKey] as boolean;
  const recipientsValue = form[activeConfig.recipientsKey] as string;
  const boardEnabledValue = form[activeConfig.boardEnabledKey] as boolean;
  const boardStatusesValue = form[activeConfig.boardStatusesKey] as string[];

  const handleFieldChange = <K extends InquiryFormKey>(
    key: K,
    value: InquirySettingsFormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.inquirySettingsRef(),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const careers =
          Array.isArray(data?.careersDefaultRecipients)
            ? data.careersDefaultRecipients.join(", ")
            : typeof data?.careersDefaultRecipients === "string"
              ? data.careersDefaultRecipients
              : DEFAULT_STATE.careersDefaultRecipients;

        const lessons =
          Array.isArray(data?.lessonsDefaultRecipients)
            ? data.lessonsDefaultRecipients.join(", ")
            : typeof data?.lessonsDefaultRecipients === "string"
              ? data.lessonsDefaultRecipients
              : DEFAULT_STATE.lessonsDefaultRecipients;

        const next: InquirySettingsFormState = {
          franchiseDefaultRecipients:
            Array.isArray(data?.franchiseDefaultRecipients)
              ? data.franchiseDefaultRecipients.join(", ")
              : typeof data?.franchiseDefaultRecipients === "string"
                ? data.franchiseDefaultRecipients
                : DEFAULT_STATE.franchiseDefaultRecipients,
          careersDefaultRecipients: careers,
          lessonsDefaultRecipients: lessons,
          leaguesDefaultRecipients:
            Array.isArray(data?.leaguesDefaultRecipients)
              ? data.leaguesDefaultRecipients.join(", ")
              : typeof data?.leaguesDefaultRecipients === "string"
                ? data.leaguesDefaultRecipients
                : DEFAULT_STATE.leaguesDefaultRecipients,
          fittingsDefaultRecipients:
            Array.isArray(data?.fittingsDefaultRecipients)
              ? data.fittingsDefaultRecipients.join(", ")
              : typeof data?.fittingsDefaultRecipients === "string"
                ? data.fittingsDefaultRecipients
                : DEFAULT_STATE.fittingsDefaultRecipients,
          membershipsDefaultRecipients:
            Array.isArray(data?.membershipsDefaultRecipients)
              ? data.membershipsDefaultRecipients.join(", ")
              : typeof data?.membershipsDefaultRecipients === "string"
                ? data.membershipsDefaultRecipients
                : DEFAULT_STATE.membershipsDefaultRecipients,
          eventsDefaultRecipients:
            Array.isArray(data?.eventsDefaultRecipients)
              ? data.eventsDefaultRecipients.join(", ")
              : typeof data?.eventsDefaultRecipients === "string"
                ? data.eventsDefaultRecipients
                : DEFAULT_STATE.eventsDefaultRecipients,
          franchiseSendEmails: data?.franchiseSendEmails !== false,
          careersSendEmails: data?.careersSendEmails !== false,
          lessonsSendEmails: data?.lessonsSendEmails !== false,
          leaguesSendEmails: data?.leaguesSendEmails !== false,
          fittingsSendEmails: data?.fittingsSendEmails !== false,
          membershipsSendEmails: data?.membershipsSendEmails !== false,
          eventsSendEmails: data?.eventsSendEmails !== false,
          franchiseBoardEnabled: data?.franchiseBoardEnabled !== false,
          careersBoardEnabled: data?.careersBoardEnabled !== false,
          lessonsBoardEnabled: data?.lessonsBoardEnabled !== false,
          leaguesBoardEnabled: data?.leaguesBoardEnabled !== false,
          fittingsBoardEnabled: data?.fittingsBoardEnabled !== false,
          membershipsBoardEnabled: data?.membershipsBoardEnabled !== false,
          eventsBoardEnabled: data?.eventsBoardEnabled !== false,
          franchiseBoardStatuses: resolveBoardStatuses(
            data?.franchiseBoardStatuses,
            DEFAULT_STATE.franchiseBoardStatuses,
          ),
          careersBoardStatuses: resolveBoardStatuses(
            data?.careersBoardStatuses,
            DEFAULT_STATE.careersBoardStatuses,
          ),
          lessonsBoardStatuses: resolveBoardStatuses(
            data?.lessonsBoardStatuses,
            DEFAULT_STATE.lessonsBoardStatuses,
          ),
          leaguesBoardStatuses: resolveBoardStatuses(
            data?.leaguesBoardStatuses,
            DEFAULT_STATE.leaguesBoardStatuses,
          ),
          fittingsBoardStatuses: resolveBoardStatuses(
            data?.fittingsBoardStatuses,
            DEFAULT_STATE.fittingsBoardStatuses,
          ),
          membershipsBoardStatuses: resolveBoardStatuses(
            data?.membershipsBoardStatuses,
            DEFAULT_STATE.membershipsBoardStatuses,
          ),
          eventsBoardStatuses: resolveBoardStatuses(
            data?.eventsBoardStatuses,
            DEFAULT_STATE.eventsBoardStatuses,
          ),
        };
        setForm(next);
        setInitial(next);
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[InquirySettings] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase]);

  const hasChanges = useMemo(() => {
    return (
      form.franchiseDefaultRecipients !== initial.franchiseDefaultRecipients ||
      form.careersDefaultRecipients !== initial.careersDefaultRecipients ||
      form.lessonsDefaultRecipients !== initial.lessonsDefaultRecipients ||
      form.leaguesDefaultRecipients !== initial.leaguesDefaultRecipients ||
      form.fittingsDefaultRecipients !== initial.fittingsDefaultRecipients ||
      form.membershipsDefaultRecipients !== initial.membershipsDefaultRecipients ||
      form.eventsDefaultRecipients !== initial.eventsDefaultRecipients ||
      form.franchiseSendEmails !== initial.franchiseSendEmails ||
      form.careersSendEmails !== initial.careersSendEmails ||
      form.lessonsSendEmails !== initial.lessonsSendEmails ||
      form.leaguesSendEmails !== initial.leaguesSendEmails ||
      form.fittingsSendEmails !== initial.fittingsSendEmails ||
      form.membershipsSendEmails !== initial.membershipsSendEmails ||
      form.eventsSendEmails !== initial.eventsSendEmails ||
      form.franchiseBoardEnabled !== initial.franchiseBoardEnabled ||
      form.careersBoardEnabled !== initial.careersBoardEnabled ||
      form.lessonsBoardEnabled !== initial.lessonsBoardEnabled ||
      form.leaguesBoardEnabled !== initial.leaguesBoardEnabled ||
      form.fittingsBoardEnabled !== initial.fittingsBoardEnabled ||
      form.membershipsBoardEnabled !== initial.membershipsBoardEnabled ||
      form.eventsBoardEnabled !== initial.eventsBoardEnabled ||
      form.franchiseBoardStatuses.join(",") !== initial.franchiseBoardStatuses.join(",") ||
      form.careersBoardStatuses.join(",") !== initial.careersBoardStatuses.join(",") ||
      form.lessonsBoardStatuses.join(",") !== initial.lessonsBoardStatuses.join(",") ||
      form.leaguesBoardStatuses.join(",") !== initial.leaguesBoardStatuses.join(",") ||
      form.fittingsBoardStatuses.join(",") !== initial.fittingsBoardStatuses.join(",") ||
      form.membershipsBoardStatuses.join(",") !== initial.membershipsBoardStatuses.join(",") ||
      form.eventsBoardStatuses.join(",") !== initial.eventsBoardStatuses.join(",")
    );
  }, [form, initial]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await setDoc(
        firebase.inquirySettingsRef(),
        {
          careersDefaultRecipients: normalizeEmails(form.careersDefaultRecipients),
          lessonsDefaultRecipients: normalizeEmails(form.lessonsDefaultRecipients),
          leaguesDefaultRecipients: normalizeEmails(form.leaguesDefaultRecipients),
          fittingsDefaultRecipients: normalizeEmails(form.fittingsDefaultRecipients),
          membershipsDefaultRecipients: normalizeEmails(form.membershipsDefaultRecipients),
          eventsDefaultRecipients: normalizeEmails(form.eventsDefaultRecipients),
          franchiseDefaultRecipients: normalizeEmails(form.franchiseDefaultRecipients),
          franchiseSendEmails: form.franchiseSendEmails !== false,
          careersSendEmails: form.careersSendEmails !== false,
          lessonsSendEmails: form.lessonsSendEmails !== false,
          leaguesSendEmails: form.leaguesSendEmails !== false,
          fittingsSendEmails: form.fittingsSendEmails !== false,
          membershipsSendEmails: form.membershipsSendEmails !== false,
          eventsSendEmails: form.eventsSendEmails !== false,
          franchiseBoardEnabled: form.franchiseBoardEnabled !== false,
          careersBoardEnabled: form.careersBoardEnabled !== false,
          lessonsBoardEnabled: form.lessonsBoardEnabled !== false,
          leaguesBoardEnabled: form.leaguesBoardEnabled !== false,
          fittingsBoardEnabled: form.fittingsBoardEnabled !== false,
          membershipsBoardEnabled: form.membershipsBoardEnabled !== false,
          eventsBoardEnabled: form.eventsBoardEnabled !== false,
          franchiseBoardStatuses: normalizeStatusSelection(form.franchiseBoardStatuses),
          careersBoardStatuses: normalizeStatusSelection(form.careersBoardStatuses),
          lessonsBoardStatuses: normalizeStatusSelection(form.lessonsBoardStatuses),
          leaguesBoardStatuses: normalizeStatusSelection(form.leaguesBoardStatuses),
          fittingsBoardStatuses: normalizeStatusSelection(form.fittingsBoardStatuses),
          membershipsBoardStatuses: normalizeStatusSelection(form.membershipsBoardStatuses),
          eventsBoardStatuses: normalizeStatusSelection(form.eventsBoardStatuses),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success("Inquiry settings saved.");
    } catch (err: unknown) {
      console.error("[InquirySettings] save failed", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast.error("Failed to save inquiry settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Inquiry Settings
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Configure recipients and board layouts for each inquiry type.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving || !hasChanges}
          className="rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error.message}
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          {INQUIRY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                tab.key === activeTab
                  ? "bg-primary text-white"
                  : "border border-white/10 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {activeConfig.label}
          </h3>
          <p className="mt-2 text-sm text-white/60">{activeConfig.description}</p>
          <label className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
            <input
              type="checkbox"
              checked={sendEmailsValue}
              onChange={(e) =>
                handleFieldChange(activeConfig.sendEmailsKey, e.target.checked)
              }
              className="h-4 w-4 accent-primary"
            />
            {activeConfig.sendLabel}
          </label>
          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Default Recipient Emails
            </span>
            <textarea
              value={recipientsValue}
              onChange={(e) =>
                handleFieldChange(activeConfig.recipientsKey, e.target.value)
              }
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/40"
              placeholder={activeConfig.placeholder}
            />
          </label>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Board View
              </h4>
              <p className="text-xs text-white/50">
                Enable the board layout and choose which status columns appear.
              </p>
              <p className="text-xs text-white/40">
                Drag to reorder. Edits apply to both board columns and workflow status options.
              </p>
            </div>
            <label className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
              <input
                type="checkbox"
                checked={boardEnabledValue}
                onChange={(e) =>
                  handleFieldChange(activeConfig.boardEnabledKey, e.target.checked)
                }
                className="h-4 w-4 accent-primary"
              />
              Enable board view
            </label>
            <div
              className={[
                "mt-4 space-y-2",
                boardEnabledValue ? "" : "opacity-50",
              ].join(" ")}
            >
              {boardStatusesValue.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/50">
                  No statuses configured yet. Add at least one status to show board columns.
                </p>
              ) : null}
              {boardStatusesValue.map((status, index) => (
                <div
                  key={`${status}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2"
                  draggable={boardEnabledValue}
                  onDragStart={() => setDraggedStatusIndex(index)}
                  onDragEnd={() => setDraggedStatusIndex(null)}
                  onDragOver={(event) => {
                    if (!boardEnabledValue) return;
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    if (!boardEnabledValue || draggedStatusIndex === null) {
                      return;
                    }
                    if (draggedStatusIndex === index) {
                      setDraggedStatusIndex(null);
                      return;
                    }
                    const next = [...boardStatusesValue];
                    const [moved] = next.splice(draggedStatusIndex, 1);
                    next.splice(index, 0, moved);
                    handleFieldChange(activeConfig.boardStatusesKey, next);
                    setDraggedStatusIndex(null);
                  }}
                >
                  <span className="text-xs text-white/40">::</span>
                  <input
                    type="text"
                    value={status}
                    disabled={!boardEnabledValue}
                    onChange={(event) => {
                      const next = [...boardStatusesValue];
                      next[index] = event.target.value;
                      handleFieldChange(activeConfig.boardStatusesKey, next);
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!boardEnabledValue}
                    onClick={() => {
                      const next = boardStatusesValue.filter((_, i) => i !== index);
                      handleFieldChange(activeConfig.boardStatusesKey, next);
                    }}
                    className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70 transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={!boardEnabledValue}
                onClick={() => {
                  const next = [...boardStatusesValue, "New status"];
                  handleFieldChange(activeConfig.boardStatusesKey, next);
                }}
                className="mt-2 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed"
              >
                Add status
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
