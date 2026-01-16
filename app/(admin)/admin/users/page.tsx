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
import { ADMIN_NAV_ITEMS } from "@/constants/adminNav";
import useLocations from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useFirebase } from "@/providers/FirebaseProvider";
import { Badge } from "@/ui-kit/badge";
import { Button } from "@/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
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
import {
  buildAdminPageAccessKey,
  getManagerLocationIds,
  isAdmin,
} from "@/utils/auth";
import {
  FiEdit2,
  FiMail,
  FiTrash2,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";

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
  adminPageAccess?: string[];
};

type UserDraft = {
  role: UserRole;
  managerLocationIds: string[];
  pageAccess: string[];
};

const roleBadgeTone = (role: UserRole) =>
  role === "ADMIN" ? "amber" : "green";

const resolveUserRole = (roles: Record<string, unknown> | undefined): UserRole =>
  roles?.ADMIN ? "ADMIN" : "MANAGER";

const PAGE_ACCESS_OPTIONS = ADMIN_NAV_ITEMS.filter(
  (item) => item.view === "location" || item.view === "business",
).map((item) => {
  const view = item.view as "location" | "business";
  return {
    key: buildAdminPageAccessKey(view, item.tab),
    label: `${item.section ?? view} • ${item.label}`,
  };
});

export default function AdminUsersPage() {
  const firebase = useFirebase() as Firebase;
  const { authUser } = useAuth();
  const { locations } = useLocations(firebase);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("MANAGER");
  const [inviteLocationIds, setInviteLocationIds] = useState<string[]>([]);
  const [invitePageAccess, setInvitePageAccess] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<Record<string, string>>({});
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

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
          adminPageAccess: Array.isArray(data.adminPageAccess)
            ? data.adminPageAccess.filter(
                (entry: unknown): entry is string => typeof entry === "string",
              )
            : [],
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
            pageAccess: user.adminPageAccess ?? [],
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

  const handleInvitePageAccessChange = (accessKey: string, enabled: boolean) => {
    setInvitePageAccess((prev) => {
      const hasAccess = prev.includes(accessKey);
      if (enabled) {
        return hasAccess ? prev : [...prev, accessKey];
      }
      return hasAccess ? prev.filter((entry) => entry !== accessKey) : prev;
    });
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteError(null);
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
      await addDoc(firebase.userInvitesRef(), {
        email: trimmedEmail,
        role: inviteRole,
        managerLocationIds: inviteRole === "MANAGER" ? inviteLocationIds : [],
        adminPageAccess: inviteRole === "MANAGER" ? invitePageAccess : [],
        status: "pending",
        invitedBy: authUser?.uid ?? null,
        createdAt: serverTimestamp(),
      });

      setInviteEmail("");
      setInviteLocationIds([]);
      setInvitePageAccess([]);
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
        pageAccess: prev[userId]?.pageAccess ?? [],
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

  const handleUserPageAccessChange = (
    userId: string,
    accessKey: string,
    enabled: boolean,
  ) => {
    setUserDrafts((prev) => {
      const existing = prev[userId];
      if (!existing) {
        return prev;
      }
      const hasAccess = existing.pageAccess.includes(accessKey);
      const nextAccess = enabled
        ? hasAccess
          ? existing.pageAccess
          : [...existing.pageAccess, accessKey]
        : hasAccess
          ? existing.pageAccess.filter((entry) => entry !== accessKey)
          : existing.pageAccess;
      return {
        ...prev,
        [userId]: {
          ...existing,
          pageAccess: nextAccess,
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
          adminPageAccess: draft.pageAccess,
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

  const selectedUser = useMemo(
    () => users.find((entry) => entry.id === editUserId) ?? null,
    [editUserId, users],
  );
  const selectedDraft = useMemo(() => {
    if (!selectedUser) {
      return null;
    }
    return userDrafts[selectedUser.id] ?? {
      role: resolveUserRole(selectedUser.roles),
      managerLocationIds: getManagerLocationIds(selectedUser as Record<string, unknown>),
      pageAccess: selectedUser.adminPageAccess ?? [],
    };
  }, [selectedUser, userDrafts]);

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
          adminPageAccess: [],
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

  const handleSendReset = async (userId: string) => {
    const user = users.find((entry) => entry.id === userId);
    const email = user?.email;
    if (!email) {
      setUserError("User does not have an email on file.");
      return;
    }
    const confirmed = window.confirm(
      `Send a password reset email to ${email}?`,
    );
    if (!confirmed) {
      return;
    }

    setResetStatus((prev) => ({ ...prev, [userId]: "sending" }));
    setUserError(null);
    try {
      await firebase.doPasswordReset(email);
      setResetStatus((prev) => ({ ...prev, [userId]: "sent" }));
    } catch (error) {
      console.error("[AdminUsers] password reset failed", error);
      setResetStatus((prev) => ({ ...prev, [userId]: "error" }));
      setUserError(
        error instanceof Error ? error.message : "Unable to send reset email.",
      );
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Text className="text-sm font-semibold text-white">Invites</Text>
                <Text className="text-xs text-white/60">
                  Managers must be tied to at least one location. Invite links are single-use.
                </Text>
              </div>
              <Button color="emerald" onClick={() => setInviteModalOpen(true)}>
                Invite new user
              </Button>
            </div>
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
                    <TableHeader className="text-right">Invite</TableHeader>
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
                        <TableCell className="text-right">
                          <Button
                            outline
                            type="button"
                            onClick={() =>
                              handleCopyInvite(
                                `${origin || ""}/signup?invite=${invite.id}`,
                              )
                            }
                          >
                            Copy link
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-white/60" colSpan={5}>
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
              <Table dense className="table-fixed">
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader className="w-[220px]">User</TableHeader>
                    <TableHeader className="w-[120px]">Role</TableHeader>
                    <TableHeader className="w-[260px]">Locations</TableHeader>
                    <TableHeader className="w-[140px]">Access</TableHeader>
                    <TableHeader className="w-[260px] text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length ? (
                    users.map((user) => {
                      const draft = userDrafts[user.id] ?? {
                        role: resolveUserRole(user.roles),
                        managerLocationIds: getManagerLocationIds(user as Record<string, unknown>),
                        pageAccess: user.adminPageAccess ?? [],
                      };
                      const resolvedPageAccess = draft.pageAccess ?? [];
                      const isSaving = savingUserId === user.id;
                      const isDisabled = Boolean(user.disabled);

                      return (
                        <TableRow key={user.id} className="align-top">
                          <TableCell className="text-white w-[220px] max-w-[220px]">
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {user.displayName || "User"}
                              </div>
                              <div className="text-xs text-white/60">
                                {user.email ?? "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <Badge color={roleBadgeTone(draft.role)}>
                              {draft.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/70 w-[260px] max-w-[260px] whitespace-nowrap">
                            {draft.role === "ADMIN" ? (
                              "All locations"
                            ) : (
                              <span className="block truncate">
                                {draft.managerLocationIds
                                  .map((id) => managerLocations.find((location) => location.id === id)?.name ?? id)
                                  .join(", ") || "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-white/70 w-[140px]">
                            {draft.role === "ADMIN" ? (
                              "All pages"
                            ) : (
                              resolvedPageAccess.length
                                ? `${resolvedPageAccess.length} pages`
                                : "Default"
                            )}
                          </TableCell>
                          <TableCell className="text-right w-[260px]">
                            <div className="flex flex-nowrap justify-end gap-2">
                              <Button
                                outline
                                onClick={() => setEditUserId(user.id)}
                                disabled={isSaving || isDisabled}
                                title="Edit user"
                                aria-label="Edit user"
                                className="px-2 py-2"
                              >
                                <FiEdit2 className="size-4" />
                              </Button>
                              <Button
                                outline
                                onClick={() => handleSendReset(user.id)}
                                disabled={resetStatus[user.id] === "sending"}
                                title={
                                  resetStatus[user.id] === "sent"
                                    ? "Reset sent"
                                    : resetStatus[user.id] === "sending"
                                    ? "Sending reset"
                                    : "Send password reset"
                                }
                                aria-label="Send password reset"
                                className="px-2 py-2"
                              >
                                <FiMail className="size-4" />
                              </Button>
                              <Button
                                color={isDisabled ? "emerald" : "red"}
                                onClick={() =>
                                  isDisabled
                                    ? handleEnableUser(user.id)
                                    : handleDisableUser(user.id)
                                }
                                disabled={isSaving}
                                title={isDisabled ? "Enable user" : "Disable user"}
                                aria-label={isDisabled ? "Enable user" : "Disable user"}
                                className="px-2 py-2"
                              >
                                {isDisabled ? (
                                  <FiUserCheck className="size-4" />
                                ) : (
                                  <FiUserX className="size-4" />
                                )}
                              </Button>
                              <Button
                                color="red"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={isSaving}
                                title="Delete user"
                                aria-label="Delete user"
                                className="px-2 py-2"
                              >
                                <FiTrash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="text-white/60" colSpan={5}>
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
      {selectedUser && selectedDraft ? (
        <Dialog open={Boolean(editUserId)} onClose={() => setEditUserId(null)}>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update roles, location access, and page visibility for this user.
          </DialogDescription>
          <DialogBody>
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-semibold text-white">
                  {selectedUser.displayName || "User"}
                </p>
                <p className="text-xs text-white/60">{selectedUser.email ?? "—"}</p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Role
                </label>
                <select
                  value={selectedDraft.role}
                  onChange={(event) =>
                    handleUserRoleChange(
                      selectedUser.id,
                      event.target.value === "ADMIN" ? "ADMIN" : "MANAGER",
                    )
                  }
                  disabled={Boolean(selectedUser.disabled)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Locations
                </p>
                {selectedDraft.role === "ADMIN" ? (
                  <p className="text-sm text-white/70">All locations</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {managerLocations.map((location) => (
                      <label
                        key={`modal-location-${selectedUser.id}-${location.id}`}
                        className="flex items-center gap-2 text-xs text-white/80 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDraft.managerLocationIds.includes(location.id)}
                          onChange={(event) =>
                            handleUserLocationChange(
                              selectedUser.id,
                              location.id,
                              event.target.checked,
                            )
                          }
                          disabled={Boolean(selectedUser.disabled)}
                          className="size-4 accent-emerald-500"
                        />
                        {location.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Page access
                </p>
                {selectedDraft.role === "ADMIN" ? (
                  <p className="text-sm text-white/70">All pages</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {PAGE_ACCESS_OPTIONS.map((option) => (
                      <label
                        key={`modal-access-${selectedUser.id}-${option.key}`}
                        className="flex items-center gap-2 text-xs text-white/80 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDraft.pageAccess.includes(option.key)}
                          onChange={(event) =>
                            handleUserPageAccessChange(
                              selectedUser.id,
                              option.key,
                              event.target.checked,
                            )
                          }
                          disabled={Boolean(selectedUser.disabled)}
                          className="size-4 accent-emerald-500"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={() => setEditUserId(null)}>
              Close
            </Button>
            <Button
              color="emerald"
              onClick={() => {
                handleSaveUser(selectedUser.id);
                setEditUserId(null);
              }}
              disabled={savingUserId === selectedUser.id || Boolean(selectedUser.disabled)}
            >
              {savingUserId === selectedUser.id ? "Saving…" : "Save changes"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)}>
        <DialogTitle>Invite new user</DialogTitle>
        <DialogDescription>
          Create an invite link for an admin or manager.
        </DialogDescription>
        <DialogBody>
          <form
            onSubmit={(event) => {
              handleInviteSubmit(event);
              setInviteModalOpen(false);
            }}
            className="space-y-4"
          >
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
                    setInvitePageAccess([]);
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
              {inviteRole === "ADMIN" ? (
                <p className="text-xs text-white/70">All locations</p>
              ) : (
                <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/40 p-3 text-xs normal-case text-white/70">
                  {managerLocations.map((location) => (
                    <label
                      key={`invite-location-${location.id}`}
                      className="flex items-center gap-2 text-xs cursor-pointer"
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
                        className="size-4 accent-emerald-500"
                      />
                      {location.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs uppercase tracking-wide text-white/60">
              Page access
              {inviteRole === "ADMIN" ? (
                <p className="text-xs text-white/70">All pages</p>
              ) : (
                <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/40 p-3 text-xs normal-case text-white/70">
                  {PAGE_ACCESS_OPTIONS.map((option) => (
                    <label
                      key={`invite-access-${option.key}`}
                      className="flex items-center gap-2 text-xs cursor-pointer text-white/80"
                    >
                      <input
                        type="checkbox"
                        checked={invitePageAccess.includes(option.key)}
                        onChange={(event) =>
                          handleInvitePageAccessChange(
                            option.key,
                            event.target.checked,
                          )
                        }
                        className="size-4 accent-emerald-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {inviteError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
                {inviteError}
              </div>
            ) : null}
          </form>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={() => setInviteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            color="emerald"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              handleInviteSubmit(event as unknown as React.FormEvent);
              setInviteModalOpen(false);
            }}
            disabled={inviting}
          >
            {inviting ? "Creating…" : "Create invite"}
          </Button>
        </DialogActions>
      </Dialog>
    </RequireAuth>
  );
}
