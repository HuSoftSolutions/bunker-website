"use client";

import clsx from "clsx";
import type React from "react";
import { format } from "date-fns";
import {
  DEFAULT_WORKFLOW_STATUS,
  WORKFLOW_STATUSES,
  type InquiryWorkflowEntry,
  type InquiryWorkflowStatus,
} from "@/utils/inquiryWorkflow";
import { WorkflowControls } from "./WorkflowControls";

export type InquiryBoardLaneId = "status" | "assignee" | "location" | "source" | "date";

export const INQUIRY_BOARD_LANE_LABELS: Record<InquiryBoardLaneId, string> = {
  status: "Workflow status",
  assignee: "Assignee",
  location: "Location",
  source: "Source / Referral",
  date: "Submission date",
};

export function isInquiryBoardLaneId(value: string): value is InquiryBoardLaneId {
  return value in INQUIRY_BOARD_LANE_LABELS;
}

export type InquiryBoardItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  contact?: string;
  dateLabel?: string;
  unread?: boolean;
  dateValue?: Date | null;
  laneValues?: Partial<Record<InquiryBoardLaneId, string | null>>;
};

type InquiryBoardProps = {
  items: InquiryBoardItem[];
  workflowState: Record<string, InquiryWorkflowEntry>;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onAssigneeChange: (inquiryId: string, assignee: string) => void;
  onOpen?: (inquiryId: string) => void;
  onMarkRead?: (inquiryId: string) => void;
  lane?: InquiryBoardLaneId;
  allowedStatuses?: InquiryWorkflowStatus[];
  renderControls?: (item: InquiryBoardItem, entry: InquiryWorkflowEntry) => React.ReactNode;
  showAssigneeMeta?: boolean;
};

export function InquiryBoard({
  items,
  workflowState,
  onStatusChange,
  onAssigneeChange,
  onOpen,
  onMarkRead,
  lane = "status",
  allowedStatuses,
  renderControls,
  showAssigneeMeta,
}: InquiryBoardProps) {
  const shouldShowAssigneeMeta =
    typeof showAssigneeMeta === "boolean" ? showAssigneeMeta : !renderControls;
  const laneLabel = INQUIRY_BOARD_LANE_LABELS[lane] ?? "Workflow status";
  const resolveLaneValue = (item: InquiryBoardItem, entry: InquiryWorkflowEntry) => {
    if (lane === "status") {
      return entry.status || DEFAULT_WORKFLOW_STATUS;
    }
    if (lane === "assignee") {
      return entry.assignedTo?.trim() || "Unassigned";
    }
    if (lane === "date") {
      if (!item.dateValue || Number.isNaN(item.dateValue.getTime())) {
        return "No date";
      }
      try {
        return format(item.dateValue, "MMM yyyy");
      } catch (error) {
        console.warn("[InquiryBoard] failed to format lane date", error);
        return item.dateValue.toLocaleDateString();
      }
    }
    return item.laneValues?.[lane] ?? "—";
  };

  const laneValues = (() => {
    if (lane === "status") {
      if (allowedStatuses) {
        return allowedStatuses;
      }
      return WORKFLOW_STATUSES;
    }
    const unique = new Set<string>();
    items.forEach((item) => {
      const entry = workflowState[item.id] ?? {
        assignedTo: "",
        status: DEFAULT_WORKFLOW_STATUS,
      };
      const value = resolveLaneValue(item, entry);
      if (value) {
        unique.add(value);
      }
    });
    const values = Array.from(unique);
    if (lane === "assignee") {
      values.sort((a, b) => {
        if (a === "Unassigned") return -1;
        if (b === "Unassigned") return 1;
        return a.localeCompare(b);
      });
      return values;
    }
    return values.sort((a, b) => a.localeCompare(b));
  })();

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {laneValues.map((laneValue) => {
        const itemsForLane = items.filter((item) => {
          const entry = workflowState[item.id] ?? {
            assignedTo: "",
            status: DEFAULT_WORKFLOW_STATUS,
          };
          return resolveLaneValue(item, entry) === laneValue;
        });

        return (
          <div
            key={`${lane}-${laneValue}`}
            className="rounded-2xl border border-white/10 bg-black/30 shadow-lg shadow-black/30"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
                  {laneLabel}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                  {laneValue}
                </p>
              </div>
              <span className="text-xs text-white/50">{itemsForLane.length}</span>
            </div>
            <div className="space-y-3 p-3">
              {itemsForLane.length ? (
                itemsForLane.map((item) => {
                  const entry = workflowState[item.id] ?? {
                    assignedTo: "",
                    status: DEFAULT_WORKFLOW_STATUS,
                  };
                  const handleOpen = () => {
                    if (onMarkRead) {
                      onMarkRead(item.id);
                    }
                    if (onOpen) {
                      onOpen(item.id);
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-zinc-950/70 p-3 shadow-md shadow-black/30 transition hover:border-primary/40"
                      role={onOpen ? "button" : undefined}
                      tabIndex={onOpen ? 0 : undefined}
                      onClick={onOpen ? handleOpen : undefined}
                      onKeyDown={
                        onOpen
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleOpen();
                              }
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white break-words">
                            {item.title}
                          </p>
                          {item.subtitle ? (
                            <p className="text-xs text-white/60 break-words">
                              {item.subtitle}
                            </p>
                          ) : null}
                          {item.meta ? (
                            <p className="text-xs text-white/60 break-words">{item.meta}</p>
                          ) : null}
                        </div>
                        {item.unread ? (
                          <span className="rounded-full bg-primary/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                            New
                          </span>
                        ) : null}
                      </div>
                      {item.contact ? (
                        <p className="mt-2 text-xs text-primary break-all">
                          {item.contact}
                        </p>
                      ) : null}
                      {item.dateLabel ? (
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-white/40">
                          {item.dateLabel}
                        </p>
                      ) : null}

                      <div className="mt-3">
                        {renderControls ? (
                          renderControls(item, entry)
                        ) : (
                          <WorkflowControls
                            inquiryId={item.id}
                            entry={entry}
                            onStatusChange={onStatusChange}
                            onAssigneeChange={onAssigneeChange}
                            statuses={allowedStatuses}
                          />
                        )}
                      </div>

                      {onOpen && shouldShowAssigneeMeta ? (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wide text-white/50">
                            Assigned: {entry.assignedTo || "—"}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpen();
                            }}
                            className={clsx(
                              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                              "border-white/20 text-white hover:border-primary/60 hover:text-primary",
                            )}
                          >
                            View Details
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-[11px] uppercase tracking-wide text-white/50">
                          Assigned: {entry.assignedTo || "—"}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="px-2 py-4 text-center text-xs text-white/50">
                  No inquiries in this state yet.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
