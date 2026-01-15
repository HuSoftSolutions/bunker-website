"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onSnapshot, setDoc } from "firebase/firestore";
import { AdminShell } from "@/components/admin/AdminShell";
import { SignTvManager } from "@/components/admin/signTv/SignTvManager";
import useLocations from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useFirebase } from "@/providers/FirebaseProvider";
import { isAdmin } from "@/utils/auth";
import { Button } from "@/ui-kit/button";
import { Select } from "@/ui-kit/select";
import { Text } from "@/ui-kit/text";
import { toast } from "react-toastify";

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

type SignTvFormState = {
  signTvs?: unknown[];
};

export default function SignTvAdminPage() {
  const firebase = useFirebase() as Firebase;
  const { authUser } = useAuth();
  const isAdminUser = isAdmin(authUser);
  const { locations } = useLocations(firebase);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [form, setForm] = useState<SignTvFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) => resolveStringValue(location?.id) === selectedLocationId,
      ) ?? null,
    [locations, selectedLocationId],
  );

  useEffect(() => {
    if (!selectedLocationId && locations.length) {
      const fallbackId = resolveStringValue(locations[0]?.id);
      if (fallbackId) {
        setSelectedLocationId(fallbackId);
      }
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setForm(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      firebase.locationRef(selectedLocationId),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setForm({
          signTvs: Array.isArray(data?.signTvs) ? data.signTvs : [],
        });
        setLoading(false);
      },
      (error) => {
        console.error("[SignTvAdmin] failed to load location", error);
        setForm(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase, selectedLocationId]);

  const handleSave = useCallback(async () => {
    if (!selectedLocationId || !form) {
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        firebase.locationRef(selectedLocationId),
        {
          signTvs: Array.isArray(form.signTvs) ? form.signTvs : [],
        },
        { merge: true },
      );
      toast.success("Sign TV settings saved.");
    } catch (error) {
      console.error("[SignTvAdmin] failed to save", error);
      toast.error("Unable to save sign TV settings.");
    } finally {
      setSaving(false);
    }
  }, [firebase, form, selectedLocationId]);

  if (!isAdminUser) {
    return (
      <AdminShell title="Sign TVs">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 text-sm text-white/70 shadow-xl shadow-black/30">
          You do not have access to this page.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Sign TVs"
      toolbar={
        <Button color="red" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-sm text-white/60">Selected location</Text>
            <Text className="text-lg font-semibold text-white">
              {resolveStringValue(selectedLocation?.name, "Select a location")}
            </Text>
          </div>
          <div className="min-w-[220px]">
            <Select
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
            >
              {locations.map((location) => {
                const id = resolveStringValue(location?.id);
                const name = resolveStringValue(location?.name, "Location");
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <Text className="text-sm text-white/60">Loading sign TVs…</Text>
      ) : form ? (
        <SignTvManager
          firebase={firebase}
          locationId={selectedLocationId}
          locationName={resolveStringValue(selectedLocation?.name, "Location")}
          signTvs={form.signTvs ?? []}
          mode="business"
          canManageTvs={isAdminUser}
          canManageBusinessGraphics={isAdminUser}
          canManageLocationGraphics
          onChangeSignTvs={(next) =>
            setForm((prev) => ({ ...(prev ?? {}), signTvs: next }))
          }
        />
      ) : (
        <Text className="text-sm text-white/60">Select a location to begin.</Text>
      )}
    </AdminShell>
  );
}
