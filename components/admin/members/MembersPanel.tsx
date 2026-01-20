"use client";

import { useCallback, useEffect, useMemo, useState, useId } from "react";
import clsx from "clsx";
import { addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import type { LocationRecord } from "@/data/locationConfig";
import { DEFAULT_MEMBERSHIP_CONTENT } from "@/data/membershipContent";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import { useMembers, type MemberRecord } from "@/hooks/useMembers";
import {
  buildInquiryLocationOptions,
  matchesInquiryLocation,
} from "@/utils/inquiryLocationFilter";
import { Button } from "@/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
import { Field, Label, Description } from "@/ui-kit/fieldset";
import { Input } from "@/ui-kit/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui-kit/table";
import { Text } from "@/ui-kit/text";
import { Textarea } from "@/ui-kit/textarea";
import { format } from "date-fns";

type MembersPanelScope = "all" | "location";

type MembersPanelProps = {
  firebase: Firebase;
  locations: LocationRecord[];
  scope?: MembersPanelScope;
  locationId?: string | null;
  locationName?: string | null;
};

type MemberFormState = {
  fullName: string;
  recipientName: string;
  email: string;
  phone: string;
  primaryLocation: string;
  primaryLocationId: string;
  membershipType: string;
  referredBy: string;
  notes: string;
};

const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;

const formatDateForDisplay = (dateValue?: Date | null) => {
  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return "—";
  }
  try {
    return format(dateValue, "PP p");
  } catch (error) {
    console.warn("[MembersPanel] failed to format date", error);
    return dateValue.toLocaleString();
  }
};

const createEmptyDraft = (
  locationId = "",
  locationName = "",
): MemberFormState => ({
  fullName: "",
  recipientName: "",
  email: "",
  phone: "",
  primaryLocation: locationName,
  primaryLocationId: locationId,
  membershipType: "",
  referredBy: "",
  notes: "",
});

export function MembersPanel({
  firebase,
  locations,
  scope = "all",
  locationId,
  locationName,
}: MembersPanelProps) {
  const { members, loading, error } = useMembers(firebase);
  const { settings: businessSettings } = useBusinessSettings(firebase);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(locationId ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [draft, setDraft] = useState<MemberFormState>(() =>
    createEmptyDraft(locationId ?? "", locationName ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (scope === "location") {
      setSelectedLocationId(locationId ?? "");
    }
  }, [scope, locationId]);

  const locationOptions = useMemo(
    () => buildInquiryLocationOptions(locations),
    [locations],
  );

  const membershipTypes = useMemo(() => {
    const configured = businessSettings.membershipForm?.membershipTypes;
    if (Array.isArray(configured) && configured.length) {
      return configured.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
      );
    }
    return [...DEFAULT_MEMBERSHIP_CONTENT.membershipTypes];
  }, [businessSettings.membershipForm]);

  const activeLocation = useMemo(() => {
    if (!selectedLocationId) {
      return null;
    }
    return locationOptions.find((option) => option.id === selectedLocationId) ?? null;
  }, [locationOptions, selectedLocationId]);

  const resolveLocationName = useCallback(
    (id: string) =>
      locationOptions.find((option) => option.id === id)?.name ?? "",
    [locationOptions],
  );

  const filteredMembers = useMemo(() => {
    if (scope === "location" && !selectedLocationId) {
      return [];
    }
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return members.filter((member) => {
      if (activeLocation) {
        const matchesLocation =
          member.primaryLocationId === activeLocation.id ||
          matchesInquiryLocation(member.primaryLocation, activeLocation);
        if (!matchesLocation) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        member.fullName,
        member.recipientName,
        member.email,
        member.phone,
        member.primaryLocation,
        member.membershipType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [members, activeLocation, searchTerm, scope, selectedLocationId]);

  const openCreate = useCallback(() => {
    const seededLocationId =
      scope === "location" ? (locationId ?? "") : selectedLocationId;
    const seededLocationName =
      scope === "location"
        ? (locationName ?? "")
        : resolveLocationName(seededLocationId);
    setEditingMember(null);
    setDraft(createEmptyDraft(seededLocationId, seededLocationName));
    setFormError(null);
    setDialogOpen(true);
  }, [
    locationId,
    locationName,
    resolveLocationName,
    scope,
    selectedLocationId,
  ]);

  const openEdit = useCallback((member: MemberRecord) => {
    setEditingMember(member);
    setDraft({
      fullName: member.fullName ?? "",
      recipientName: member.recipientName ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      primaryLocation: member.primaryLocation ?? "",
      primaryLocationId: member.primaryLocationId ?? "",
      membershipType: member.membershipType ?? "",
      referredBy: member.referredBy ?? "",
      notes: member.notes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }, []);

  const updateDraft = useCallback((field: keyof MemberFormState, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLocationChange = useCallback((value: string) => {
    const match = locationOptions.find(
      (option) => option.name.toLowerCase() === value.trim().toLowerCase(),
    );
    setDraft((prev) => ({
      ...prev,
      primaryLocation: value,
      primaryLocationId: match?.id ?? "",
    }));
  }, [locationOptions]);

  const validateDraft = useCallback(() => {
    if (!draft.fullName.trim()) {
      return "Full name is required.";
    }
    if (!draft.email.trim() || !EMAIL_REGEX.test(draft.email.trim())) {
      return "A valid email is required.";
    }
    if (!draft.phone.trim()) {
      return "Phone number is required.";
    }
    if (!draft.primaryLocation.trim()) {
      return "Primary location is required.";
    }
    if (!draft.membershipType.trim()) {
      return "Membership type is required.";
    }
    return null;
  }, [draft]);

  const handleSave = useCallback(async () => {
    const validationError = validateDraft();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      fullName: draft.fullName.trim(),
      recipientName: draft.recipientName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      primaryLocation: draft.primaryLocation.trim(),
      primaryLocationId: draft.primaryLocationId.trim() || null,
      membershipType: draft.membershipType.trim(),
      referredBy: draft.referredBy.trim() || null,
      notes: draft.notes.trim() || null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingMember) {
        await updateDoc(doc(firebase.membersRef(), editingMember.memberId), payload);
      } else {
        await addDoc(firebase.membersRef(), {
          ...payload,
          inquiryId: null,
          createdAt: serverTimestamp(),
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("[MembersPanel] failed to save", error);
      setFormError(error instanceof Error ? error.message : "Failed to save member.");
    } finally {
      setSaving(false);
    }
  }, [draft, editingMember, firebase, validateDraft]);

  const handleDelete = useCallback(
    async (member: MemberRecord) => {
      if (!window.confirm(`Delete ${member.fullName || "this member"}? This cannot be undone.`)) {
        return;
      }

      try {
        await deleteDoc(doc(firebase.membersRef(), member.memberId));
      } catch (error) {
        console.error("[MembersPanel] failed to delete", error);
        setFormError(error instanceof Error ? error.message : "Failed to delete member.");
      }
    },
    [firebase],
  );

  const locationListId = useId();
  const membershipTypeListId = useId();

  const hasFilters = Boolean(searchTerm.trim() || (scope === "all" && selectedLocationId));

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/40">
      <div className="border-b border-white/10 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">
              Members
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {loading
                ? "Loading members…"
                : `${filteredMembers.length} of ${members.length} members`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button color="red" onClick={openCreate}>
              Add member
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
            Search
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, email, or phone"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
            />
          </label>
          {scope === "all" ? (
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-white/60">
              Location
              <select
                value={selectedLocationId}
                onChange={(event) => setSelectedLocationId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              >
                <option value="">All locations</option>
                {locationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-end">
              <Text className="text-xs uppercase tracking-wide text-white/60">
                Location: {activeLocation?.name ?? (locationName || "Selected location")}
              </Text>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                if (scope === "all") {
                  setSelectedLocationId("");
                }
              }}
              disabled={!hasFilters}
              className={clsx(
                "rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                hasFilters
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
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            We couldn&apos;t load members. {error.message}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center text-sm text-white/60">
            {hasFilters
              ? "No members match the filters you have applied."
              : "No members have been added yet."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <Table dense>
              <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Membership</TableHeader>
                  <TableHeader>Updated</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.memberId}>
                    <TableCell className="text-white">
                      <div className="font-semibold">{member.fullName || "—"}</div>
                      {member.recipientName ? (
                        <div className="text-xs text-white/60">
                          Recipient: {member.recipientName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-white/70">
                      <div>{member.email || "—"}</div>
                      <div className="text-xs text-white/50">{member.phone || "—"}</div>
                    </TableCell>
                    <TableCell className="text-white/70">
                      {member.primaryLocation || "—"}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {member.membershipType || "—"}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {formatDateForDisplay(member.updatedAtDate || member.createdAtDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button outline onClick={() => openEdit(member)}>
                          Edit
                        </Button>
                        <Button color="red" onClick={() => handleDelete(member)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {dialogOpen ? (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} size="2xl">
          <DialogTitle>{editingMember ? "Edit member" : "Add member"}</DialogTitle>
          <DialogDescription>
            {editingMember
              ? "Update member details and save the changes."
              : "Add a new member record to the roster."}
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <Label>Full name</Label>
                <Input
                  type="text"
                  value={draft.fullName}
                  onChange={(event) => updateDraft("fullName", event.target.value)}
                />
              </Field>

              <Field>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => updateDraft("email", event.target.value)}
                />
              </Field>

              <Field>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                />
              </Field>

              <Field>
                <Label>Primary location</Label>
                <Input
                  type="text"
                  list={locationListId}
                  value={draft.primaryLocation}
                  onChange={(event) => handleLocationChange(event.target.value)}
                />
                <datalist id={locationListId}>
                  {locationOptions.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
              </Field>

              <Field>
                <Label>Membership type</Label>
                <Input
                  type="text"
                  list={membershipTypeListId}
                  value={draft.membershipType}
                  onChange={(event) => updateDraft("membershipType", event.target.value)}
                />
                <datalist id={membershipTypeListId}>
                  {membershipTypes.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </Field>

              <Field>
                <Label>Recipient name</Label>
                <Input
                  type="text"
                  value={draft.recipientName}
                  onChange={(event) => updateDraft("recipientName", event.target.value)}
                />
              </Field>

              <Field>
                <Label>Referred by</Label>
                <Input
                  type="text"
                  value={draft.referredBy}
                  onChange={(event) => updateDraft("referredBy", event.target.value)}
                />
              </Field>

              <Field className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                />
              </Field>

              {editingMember?.inquiryId ? (
                <Field className="md:col-span-2">
                  <Label>Inquiry ID</Label>
                  <Description>{editingMember.inquiryId}</Description>
                </Field>
              ) : null}
            </div>

            {formError ? (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            ) : null}
          </DialogBody>
          <DialogActions>
            <Button outline onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save member"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </section>
  );
}
