export type UserRole = "ADMIN" | "MANAGER";

const ROLE_KEYS: UserRole[] = ["ADMIN", "MANAGER"];

const readRoles = (authUser: Record<string, unknown> | null) => {
  if (!authUser || typeof authUser !== "object") {
    return {};
  }
  const roles = authUser["roles"];
  if (!roles || typeof roles !== "object") {
    return {};
  }
  return roles as Record<string, unknown>;
};

export const hasRole = (
  authUser: Record<string, unknown> | null,
  role: UserRole,
) => Boolean(readRoles(authUser)[role]);

export const isAdmin = (authUser: Record<string, unknown> | null) =>
  hasRole(authUser, "ADMIN");

export const isManager = (authUser: Record<string, unknown> | null) =>
  hasRole(authUser, "MANAGER");

export const isAdminOrManager = (authUser: Record<string, unknown> | null) =>
  ROLE_KEYS.some((role) => hasRole(authUser, role));

export const isDisabled = (authUser: Record<string, unknown> | null) => {
  if (!authUser || typeof authUser !== "object") {
    return false;
  }
  return Boolean(authUser["disabled"]);
};

export const getManagerLocationIds = (
  authUser: Record<string, unknown> | null,
) => {
  if (!authUser || typeof authUser !== "object") {
    return [];
  }
  const value =
    authUser["managerLocationIds"] ??
    authUser["locationIds"] ??
    authUser["locations"];
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry === "string" && entry.trim()) {
      unique.add(entry.trim());
    }
  });
  return Array.from(unique);
};
