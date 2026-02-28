const rawSignTvUserId = (process.env.NEXT_PUBLIC_SIGNTV_USER_ID ?? "").trim();
export const SIGNTV_USER_ID = rawSignTvUserId.replace(/[^A-Za-z0-9_-]/g, "");

export const SIGNTV_LOCATION_NAME_MAP: Record<string, string[]> = {
  mohawkharbor: ["Mohawk Harbor #1", "Mohawk Harbor #2"],
  saratoga: ["Saratoga"],
  cliftonpark: ["Clifton Park"],
  latham: ["Latham"],
  guilderland: ["Guilderland"],
  newhartford: ["New Hartford"],
  northgreenbush: ["North Greenbush"],
};
