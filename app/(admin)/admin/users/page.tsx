"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import useLocations from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useFirebase } from "@/providers/FirebaseProvider";
import { Badge } from "@/ui-kit/badge";
import { Button } from "@/ui-kit/button";
import { Input } from "@/ui-kit/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui-kit/table";
import { Text } from "@/ui-kit/text";
import { getManagerLocationIds, isAdmin } from "@/utils/auth";

type UserRole = "ADMIN" | "MANAGER";

type InviteRecord = {
  id: string;
  email: string;
  role: UserRole;
  managerLocationIds: string[];
  status?: string;
  createdAt?: string;
};

type UserRecord = {
  id: string;
  email?: string;
  displayName?: string;
  roles?: Record<string, unknown>;
  managerLocationIds?: string[];
  disabled?: boolean;
};

type UserDraft = {
  role: UserRole;
  managerLocationIds: string[];
};

const roleBadgeTone = (role: UserRole) =>
  role === "ADMIN" ? "amber" : "green";

const resolveUserRole = (roles: Record<string, unknown> | undefined): UserRole =>
  roles?.ADMIN ? "ADMIN" : "MANAGER";

export default function AdminUsersPage() {
  const firebase = useFirebase() as Firebase;
  const { authUser } = useAuth();
  const { locations } = useLocations(firebase);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("MANAGER");
  const [inviteLocationIds, setInviteLocationIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const managerLocations = useMemo(
    () =>
      locations.map((location) => ({
        id: typeof location.id === "string" ? location.id : "",
        name: typeof location.name === "string" ? location.name : "Location",
      })),
    [locations],
  );

  useEffect(() => {
    const invitesQuery = query(firebase.userInvitesRef(), orderBy("createdAt", "desc"));
    const unsubInvites = onSnapshot(invitesQuery, (snapshot) => {
      const nextInvites = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          email: typeof data.email === "string" ? data.email : "",
          role: data.role === "ADMIN" ? "ADMIN" : "MANAGER",
          managerLocationIds: Array.isArray(data.managerLocationIds)
            ? data.managerLocationIds.filter((entry: unknown): entry is string => typeof entry === "string")
            : [],
          status: typeof data.status === "string" ? data.status : undefined,
          createdAt:
            typeof data.createdAt?.toDate === "function"
              ? data.createdAt.toDate().toLocaleString()
              : undefined,
        } satisfies InviteRecord;
      });
      setInvites(nextInvites);
    });

    const unsubUsers = onSnapshot(firebase.usersRef(), (snapshot) => {
      const nextUsers = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          email: typeof data.email === "string" ? data.email : undefined,
          displayName:
            typeof data.displayName === "string" ? data.displayName : undefined,
          roles: data.roles as Record<string, unknown> | undefined,
          managerLocationIds: Array.isArray(data.managerLocationIds)
            ? data.managerLocationIds.filter((entry: unknown): entry is string => typeof entry === "string")
            : undefined,
          disabled: Boolean(data.disabled),
        } satisfies UserRecord;
      });
      setUsers(nextUsers);
    });

    return () => {
      unsubInvites();
      unsubUsers();
    };
  }, [firebase]);

  useEffect(() => {
    setUserDrafts((prev) => {
      const next = { ...prev };
      users.forEach((user) => {
        if (!next[user.id]) {
          next[user.id] = {
            role: resolveUserRole(user.roles),
            managerLocationIds: getManagerLocationIds(user as Record<string, unknown>),
          };
        }
      });
      return next;
    });
  }, [users]);

  const handleInviteLocationChange = (locationId: string, enabled: boolean) => {
    setInviteLocationIds((prev) => {
      const hasLocation = prev.includes(locationId);
      if (enabled) {
        return hasLocation ? prev : [...prev, locationId];
      }
      return hasLocation ? prev.filter((id) => id !== locationId) : prev;
    });
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteError(null);
    setInviteLink(null);

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setInviteError("Enter an email address.");
      return;
    }

    if (inviteRole === "MANAGER" && inviteLocationIds.length === 0) {
      setInviteError("Select at least one location for a manager.");
      return;
    }

    setInviting(true);
    try {
      const inviteDoc = await addDoc(firebase.userInvitesRef(), {
        email: trimmedEmail,
        role: inviteRole,
        managerLocationIds: inviteRole === "MANAGER" ? inviteLocationIds : [],
        status: "pending",
        invitedBy: authUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });

      setInviteLink(`${origin}/signup?invite=${inviteDoc.id}`);
      setInviteEmail("");
      setInviteLocationIds([]);
      setInviteRole("MANAGER");
    } catch (error) {
      console.error("[AdminUsers] invite failed", error);
      setInviteError(
        error instanceof Error ? error.message : "Unable to create invite.",
      );
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInvite = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.warn("[AdminUsers] clipboard failed", error);
    }
  };

  const handleUserRoleChange = (userId: string, role: UserRole) => {
    setUserDrafts((prev) => ({
      ...prev,
      [userId]: {
        role,
        managerLocationIds: role === "MANAGER" ? prev[userId]?.managerLocationIds ?? [] : [],
      },
    }));
  };

  const handleUserLocationChange = (
    userId: string,
    locationId: string,
    enabled: boolean,
  ) => {
    setUserDrafts((prev) => {
      const existing = prev[userId];
      if (!existing) {
        return prev;
      }
      const hasLocation = existing.managerLocationIds.includes(locationId);
      const nextLocations = enabled
        ? hasLocation
          ? existing.managerLocationIds
          : [...existing.managerLocationIds, locationId]
        : hasLocation
          ? existing.managerLocationIds.filter((id) => id !== locationId)
          : existing.managerLocationIds;
      return {
        ...prev,
        [userId]: {
          ...existing,
          managerLocationIds: nextLocations,
        },
      };
    });
  };

  const handleSaveUser = async (userId: string) => {
    const draft = userDrafts[userId];
    if (!draft) return;

    if (draft.role === "MANAGER" && draft.managerLocationIds.length === 0) {
      setUserError("Managers must have at least one location.");
      return;
    }

    setSavingUserId(userId);
    setUserError(null);

    try {
      await setDoc(
        firebase.userRef(userId),
        {
          roles: {
            ADMIN: draft.role === "ADMIN",
            MANAGER: draft.role === "MANAGER",
          },
          managerLocationIds: draft.role === "MANAGER" ? draft.managerLocationIds : [],
        },
        { merge: true },
      );
    } catch (error) {
      console.error("[AdminUsers] update failed", error);
      setUserError(
        error instanceof Error ? error.message : "Unable to update user.",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDisableUser = async (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return;
    }
    const label = user.email || user.displayName || "this user";
    const confirmed = window.confirm(
      `Disable ${label}? They will no longer be able to access the admin area.`,
    );
    if (!confirmed) {
      return;
    }

    setSavingUserId(userId);
    setUserError(null);
    try {
      await setDoc(
        firebase.userRef(userId),
        {
          disabled: true,
          disabledAt: serverTimestamp(),
          roles: {
            ADMIN: false,
            MANAGER: false,
          },
          managerLocationIds: [],
        },
        { merge: true },
      );
    } catch (error) {
      console.error("[AdminUsers] disable failed", error);
      setUserError(
        error instanceof Error ? error.message : "Unable to disable user.",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const handleEnableUser = async (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return;
    }
    const label = user.email || user.displayName || "this user";
    const confirmed = window.confirm(`Re-enable ${label}?`);
    if (!confirmed) {
      return;
    }

    setSavingUserId(userId);
    setUserError(null);
    try {
      await setDoc(
        firebase.userRef(userId),
        {
          disabled: false,
          disabledAt: null,
        },
        { merge: true },
      );
    } catch (error) {
      console.error("[AdminUsers] enable failed", error);
      setUserError(
        error instanceof Error ? error.message : "Unable to enable user.",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      return;
    }
    const label = user.email || user.displayName || "this user";
    const confirmed = window.confirm(
      `Delete ${label}? This action is permanent.`,
    );
    if (!confirmed) {
      return;
    }

    setSavingUserId(userId);
    setUserError(null);
    try {
      await deleteDoc(firebase.userRef(userId));
    } catch (error) {
      console.error("[AdminUsers] delete failed", error);
      setUserError(
        error instanceof Error ? error.message : "Unable to delete user.",
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const condition = useMemo(
    () => (user: Record<string, unknown> | null) => isAdmin(user),
    [],
  );

  return (
    <RequireAuth condition={condition}>
      <AdminShell title="User Management">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <div className="space-y-2">
              <Text className="text-sm font-semibold text-white">Invite a new user</Text>
              <Text className="text-xs text-white/60">
                Managers must be tied to at least one location. Invite links are single-use.
              </Text>
            </div>

            <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs uppercase tracking-wide text-white/60">
                  Email
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="manager@getinthebunker.golf"
                  />
                </label>

                <label className="space-y-2 text-xs uppercase tracking-wide text-white/60">
                  Role
                  <select
                    value={inviteRole}
                    onChange={(event) => {
                      const nextRole = event.target.value === "ADMIN" ? "ADMIN" : "MANAGER";
                      setInviteRole(nextRole);
                      if (nextRole === "ADMIN") {
                        setInviteLocationIds([]);
                      }
                    }}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </label>

                <div className="space-y-2 text-xs uppercase tracking-wide text-white/60">
                  Locations
                  <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/40 p-3 text-xs normal-case text-white/70">
                    {managerLocations.map((location) => {
                      const isDisabled = inviteRole === "ADMIN";
                      return (
                        <label
                          key={`invite-location-${location.id}`}
                          className={`flex items-center gap-2 text-xs ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={inviteLocationIds.includes(location.id)}
                            onChange={(event) =>
                              handleInviteLocationChange(
                                location.id,
                                event.target.checked,
                              )
                            }
                            disabled={isDisabled}
                            className="size-4 accent-emerald-500"
                          />
                          {location.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {inviteError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                  {inviteError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button color="emerald" type="submit" disabled={inviting}>
                  {inviting ? "Creating…" : "Create invite"}
                </Button>
                {inviteLink ? (
                  <Button
                    outline
                    type="button"
                    onClick={() => handleCopyInvite(inviteLink)}
                  >
                    Copy invite link
                  </Button>
                ) : null}
                {inviteLink ? (
                  <span className="text-xs text-white/60">{inviteLink}</span>
                ) : null}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <Text className="text-sm font-semibold text-white">Pending invites</Text>
            <div className="rounded-2xl border border-white/10 bg-black/40">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Locations</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invites.filter((invite) => invite.status !== "accepted").length ? (
                    invites
                      .filter((invite) => invite.status !== "accepted")
                      .map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="text-white">{invite.email || "—"}</TableCell>
                        <TableCell>
                          <Badge color={roleBadgeTone(invite.role)}>
                            {invite.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/70">
                          {invite.role === "ADMIN"
                            ? "All locations"
                            : invite.managerLocationIds
                                .map((id) => managerLocations.find((location) => location.id === id)?.name ?? id)
                                .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {invite.status ?? "pending"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-white/60" colSpan={4}>
                        No invites yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <Text className="text-sm font-semibold text-white">Users</Text>
            {userError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {userError}
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-black/40">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>User</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Locations</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length ? (
                    users.map((user) => {
                      const draft = userDrafts[user.id] ?? {
                        role: resolveUserRole(user.roles),
                        managerLocationIds: getManagerLocationIds(user as Record<string, unknown>),
                      };
                      const isSaving = savingUserId === user.id;
                      const isDisabled = Boolean(user.disabled);

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="text-white">
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {user.displayName || "User"}
                              </div>
                              <div className="text-xs text-white/60">
                                {user.email ?? "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <select
                              value={draft.role}
                              onChange={(event) =>
                                handleUserRoleChange(
                                  user.id,
                                  event.target.value === "ADMIN" ? "ADMIN" : "MANAGER",
                                )
                              }
                              disabled={isDisabled}
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MANAGER">Manager</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-white/70">
                            {draft.role === "ADMIN" ? (
                              "All locations"
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {managerLocations.map((location) => (
                                  <label
                                    key={`user-location-${user.id}-${location.id}`}
                                    className="flex items-center gap-2 text-xs cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={draft.managerLocationIds.includes(location.id)}
                                      onChange={(event) =>
                                        handleUserLocationChange(
                                          user.id,
                                          location.id,
                                          event.target.checked,
                                        )
                                      }
                                      disabled={isDisabled}
                                      className="size-4 accent-emerald-500"
                                    />
                                    {location.name}
                                  </label>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                color="emerald"
                                onClick={() => handleSaveUser(user.id)}
                                disabled={isSaving || isDisabled}
                              >
                                {isSaving ? "Saving…" : "Save"}
                              </Button>
                              <Button
                                color={isDisabled ? "emerald" : "red"}
                                onClick={() =>
                                  isDisabled
                                    ? handleEnableUser(user.id)
                                    : handleDisableUser(user.id)
                                }
                                disabled={isSaving}
                              >
                                {isDisabled ? "Enable" : "Disable"}
                              </Button>
                              <Button
                                color="red"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={isSaving}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="text-white/60" colSpan={4}>
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </AdminShell>
    </RequireAuth>
  );
}
