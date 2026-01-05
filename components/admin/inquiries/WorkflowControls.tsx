"use client";

import React from "react";
import clsx from "clsx";
import {
  DEFAULT_WORKFLOW_STATUS,
  type InquiryWorkflowEntry,
  type InquiryWorkflowStatus,
} from "@/utils/inquiryWorkflow";

type WorkflowControlsProps = {
  inquiryId: string;
  entry: InquiryWorkflowEntry;
  onStatusChange: (inquiryId: string, status: InquiryWorkflowStatus) => void;
  onAssigneeChange: (inquiryId: string, assignee: string) => void;
  layout?: "stacked" | "inline";
  statuses?: string[];
};

export function WorkflowControls({
  inquiryId,
  entry,
  onStatusChange,
  onAssigneeChange,
  layout = "stacked",
  statuses,
}: WorkflowControlsProps) {
  const options = statuses?.length ? statuses : [DEFAULT_WORKFLOW_STATUS];
  const resolvedStatus = options.includes(entry.status) ? entry.status : options[0];
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(inquiryId, event.target.value);
  };

  const handleAssigneeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onAssigneeChange(inquiryId, event.target.value);
  };

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
          onChange={handleStatusChange}
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
        Assignee
        <input
          type="text"
          value={entry.assignedTo}
          onChange={handleAssigneeChange}
          onClick={stopPropagation}
          placeholder="Add team member"
          className="rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
        />
      </label>
    </div>
  );
}
