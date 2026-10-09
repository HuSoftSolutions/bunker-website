"use client";

import { useState } from "react";
import { createLocation } from "@/lib/locations/createLocation";
import type Firebase from "@/lib/firebase/client";
import { Button } from "@/ui-kit/button";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from "@/ui-kit/dialog";
import { Field, Label, Description } from "@/ui-kit/fieldset";
import { Input } from "@/ui-kit/input";
import { LocationLaunchFields } from "./LocationLaunchFields";

export function AddLocationDialog({ firebase, onClose, onCreated }: {
  firebase: Firebase;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ name: "", comingSoon: true, city: "", openingMessage: "", images: [] });
  const [id, setId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (field: string, value: unknown) => setForm((previous) => ({ ...previous, [field]: value }));
  const create = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const locationId = await createLocation(firebase, id, form);
      onCreated(locationId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create location. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={() => { if (!saving) onClose(); }}>
      <DialogTitle>Add Location</DialogTitle>
      <DialogDescription>Creating a location publishes it on the website. Coming Soon is enabled by default.</DialogDescription>
      <form onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <DialogBody>
          <fieldset disabled={saving} className="space-y-4">
            <Field><Label>Location Name</Label><Input required value={String(form.name)} onChange={(e) => update("name", e.target.value)} /></Field>
            <Field>
              <Label>Location ID</Label>
              <Description>A unique, permanent ID, such as albany or albany-downtown.</Description>
              <Input required maxLength={80} value={id} onChange={(e) => setId(e.target.value.toLowerCase())} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </Field>
            <LocationLaunchFields form={form} onChange={update} />
          </fieldset>
          {error ? <p role="alert" className="mt-4 text-sm text-red-400">{error}</p> : null}
        </DialogBody>
        <DialogActions>
          <Button plain type="button" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Location"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
