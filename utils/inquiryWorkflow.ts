"use client";

export const WORKFLOW_STATUSES = [
  "Uncontacted",
  "Reached out",
  "Event Planned",
  "Blocked",
  "Complete",
] as const;

export type InquiryWorkflowStatus = string;

export const DEFAULT_WORKFLOW_STATUS: InquiryWorkflowStatus = WORKFLOW_STATUSES[0];

export type InquiryWorkflowEntry = {
  assignedTo: string;
  status: InquiryWorkflowStatus;
};

export function normalizeWorkflowEntry(raw: Partial<InquiryWorkflowEntry>): InquiryWorkflowEntry {
  const assignedTo = typeof raw.assignedTo === "string" ? raw.assignedTo.trim() : "";
  const status =
    typeof raw.status === "string" && raw.status.trim()
      ? raw.status.trim()
      : DEFAULT_WORKFLOW_STATUS;

  return { assignedTo, status };
}

export function parseWorkflowFromData(data: Record<string, unknown>): InquiryWorkflowEntry {
  const status = data.workflowStatus;
  const assignedTo = data.workflowAssignedTo;
  return normalizeWorkflowEntry({ status: status as InquiryWorkflowStatus, assignedTo: assignedTo as string });
}

export function resolveWorkflowStatus(
  value: unknown,
  allowedStatuses?: string[],
): InquiryWorkflowStatus {
  if (Array.isArray(allowedStatuses) && allowedStatuses.length > 0) {
    if (typeof value === "string" && allowedStatuses.includes(value)) {
      return value;
    }
    return allowedStatuses[0];
  }

  return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_WORKFLOW_STATUS;
}
