"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type SignTvFirebase from "@/lib/firebase/signTvClient";
import { SIGNTV_LOCATION_NAME_MAP, SIGNTV_USER_ID } from "@/constants/signTv";
import { Button } from "@/ui-kit/button";
import { Input } from "@/ui-kit/input";
import { Textarea } from "@/ui-kit/textarea";
import { Select } from "@/ui-kit/select";
import { Switch } from "@/ui-kit/switch";
import { Text } from "@/ui-kit/text";
import { Badge } from "@/ui-kit/badge";
import { Field, Label } from "@/ui-kit/fieldset";
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { toast } from "react-toastify";
import clsx from "clsx";

type TvSettings = {
  tvMounted?: "portrait" | "landscape";
  tvRotationDirection?: string;
  tickerDisplay?: "top" | "bottom" | "hidden";
  tickerSize?: "xs" | "sm" | "md" | "lg" | "xl";
  tickerTheme?: "light" | "dark" | "red" | "blue";
  backgroundColor?: "light" | "dark" | "red" | "blue";
};

type TvLocation = {
  id: string;
  name?: string;
  tickerText?: string;
  tvSettings?: TvSettings;
  userId?: string;
};

type TvImage = {
  id: string;
  url: string;
  name?: string;
  hidden?: boolean;
  locations?: string[];
  storagePath?: string;
};

const DEFAULT_TV_SETTINGS: TvSettings = {
  tvMounted: "landscape",
  tvRotationDirection: "translate(-50%, -50%) rotate(-90deg)",
  tickerDisplay: "bottom",
  tickerSize: "md",
  tickerTheme: "blue",
  backgroundColor: "blue",
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveSettings = (value?: TvSettings): TvSettings => ({
  ...DEFAULT_TV_SETTINGS,
  ...(value ?? {}),
});

const normalizeLocationKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, "");

const resolveLocations = (value?: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];

type SignTvPanelProps = {
  firebase: SignTvFirebase;
  locationId: string;
  locationName?: string;
};

export function SignTvPanel({
  firebase,
  locationId,
  locationName,
}: SignTvPanelProps) {
  const [availableLocations, setAvailableLocations] = useState<TvLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [resolvedUserId, setResolvedUserId] = useState<string>("");
  const [location, setLocation] = useState<TvLocation | null>(null);
  const [form, setForm] = useState<TvLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<TvImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "images">("settings");

  // Load all available Sign TV screens using collectionGroup to discover userId
  useEffect(() => {
    setLocationsLoading(true);

    const unsubscribe = onSnapshot(
      collectionGroup(firebase.db, "locations"),
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          // Extract userId from path: users/{userId}/locations/{locationId}
          const segments = docSnap.ref.path.split("/");
          const userIndex = segments.indexOf("users");
          const extractedUserId =
            userIndex >= 0 && segments.length > userIndex + 1
              ? segments[userIndex + 1]
              : "";

          return {
            id: docSnap.id,
            name: resolveStringValue(docSnap.data()?.name),
            tickerText: resolveStringValue(docSnap.data()?.tickerText),
            tvSettings: resolveSettings(docSnap.data()?.tvSettings),
            userId: extractedUserId,
          };
        });

        // Filter by SIGNTV_USER_ID if set, otherwise use all
        const filtered = SIGNTV_USER_ID
          ? docs.filter((loc) => loc.userId === SIGNTV_USER_ID)
          : docs;
        const effective = filtered.length ? filtered : docs;

        setAvailableLocations(effective);
        setResolvedUserId(effective[0]?.userId ?? "");
        setLocationsLoading(false);

        // Auto-select matching screen based on location mapping
        if (!selectedScreenId && effective.length > 0) {
          const mappedNames =
            SIGNTV_LOCATION_NAME_MAP[normalizeLocationKey(locationId)] ?? [];

          if (mappedNames.length) {
            const normalized = mappedNames.map((name) => name.toLowerCase().trim());
            const mappedMatch = effective.find((doc) =>
              normalized.includes(doc.name?.toLowerCase().trim() ?? ""),
            );
            if (mappedMatch) {
              setSelectedScreenId(mappedMatch.id);
              return;
            }
          }

          // Fallback to name match
          if (locationName) {
            const nameMatch = effective.find(
              (doc) =>
                doc.name?.toLowerCase().trim() === locationName.toLowerCase().trim(),
            );
            if (nameMatch) {
              setSelectedScreenId(nameMatch.id);
              return;
            }
          }

          // Default to first screen
          setSelectedScreenId(effective[0].id);
        }
      },
      (error) => {
        console.error("[SignTvPanel] failed to load locations", error);
        setLocationsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, locationId, locationName, selectedScreenId]);

  // Load selected screen data
  useEffect(() => {
    if (!resolvedUserId || !selectedScreenId) {
      setLocation(null);
      setForm(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const locationRef = doc(firebase.db, "users", resolvedUserId, "locations", selectedScreenId);

    const unsubscribe = onSnapshot(
      locationRef,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const nextLocation: TvLocation = {
          id: selectedScreenId,
          name: resolveStringValue(data?.name, "Location"),
          tickerText: resolveStringValue(data?.tickerText),
          tvSettings: resolveSettings(data?.tvSettings),
        };
        setLocation(nextLocation);
        setForm(nextLocation);
        setLoading(false);
      },
      (error) => {
        console.error("[SignTvPanel] failed to load location", error);
        setLocation(null);
        setForm(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, selectedScreenId, resolvedUserId]);

  // Load images
  useEffect(() => {
    if (!resolvedUserId) {
      setImages([]);
      setImagesLoading(false);
      return undefined;
    }

    setImagesLoading(true);
    const imagesRef = collection(firebase.db, "users", resolvedUserId, "images");

    const unsubscribe = onSnapshot(
      imagesRef,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: resolveStringValue(data?.url),
            name: resolveStringValue(data?.name),
            hidden: Boolean(data?.hidden),
            locations: resolveLocations(data?.locations),
            storagePath: resolveStringValue(data?.storagePath),
          } satisfies TvImage;
        });
        setImages(next);
        setImagesLoading(false);
      },
      (error) => {
        console.error("[SignTvPanel] failed to load images", error);
        setImages([]);
        setImagesLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, resolvedUserId]);

  const assignedImages = useMemo(
    () =>
      images.map((image) => ({
        ...image,
        assigned: selectedScreenId
          ? resolveLocations(image.locations).includes(selectedScreenId)
          : false,
      })),
    [images, selectedScreenId],
  );

  const handleSave = useCallback(async () => {
    if (!resolvedUserId || !selectedScreenId || !form) {
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(firebase.db, "users", resolvedUserId, "locations", selectedScreenId),
        {
          name: resolveStringValue(form.name, "Location"),
          tickerText: resolveStringValue(form.tickerText),
          tvSettings: resolveSettings(form.tvSettings),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Settings saved");
    } catch (error) {
      console.error("[SignTvPanel] failed to save", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [firebase.db, form, selectedScreenId, resolvedUserId]);

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !resolvedUserId) {
        return;
      }

      setUploading(true);
      const imagesRef = collection(firebase.db, "users", resolvedUserId, "images");

      try {
        const uploadTasks = Array.from(files).map(async (file) => {
          const safeName = file.name.replace(/\s+/g, "-");
          const storagePath = `images/${resolvedUserId}/${Date.now()}-${safeName}`;
          const objectRef = storageRef(firebase.storage, storagePath);

          await uploadBytes(objectRef, file, { contentType: file.type });
          const url = await getDownloadURL(objectRef);

          await setDoc(doc(imagesRef), {
            url,
            name: file.name,
            hidden: false,
            locations: selectedScreenId ? [selectedScreenId] : [],
            userId: resolvedUserId,
            storagePath,
            timestamp: serverTimestamp(),
          });
        });

        await Promise.all(uploadTasks);
        toast.success("Images uploaded");
      } catch (error) {
        console.error("[SignTvPanel] upload failed", error);
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [firebase.db, firebase.storage, selectedScreenId, resolvedUserId],
  );

  const toggleImageVisibility = useCallback(
    async (imageId: string, visible: boolean) => {
      if (!resolvedUserId) return;

      try {
        await updateDoc(doc(firebase.db, "users", resolvedUserId, "images", imageId), {
          hidden: !visible,
        });
      } catch (error) {
        console.error("[SignTvPanel] failed to update visibility", error);
        toast.error("Failed to update visibility");
      }
    },
    [firebase.db, resolvedUserId],
  );

  const toggleImageAssignment = useCallback(
    async (image: TvImage, assign: boolean) => {
      if (!resolvedUserId || !selectedScreenId) return;

      try {
        await updateDoc(doc(firebase.db, "users", resolvedUserId, "images", image.id), {
          locations: assign
            ? arrayUnion(selectedScreenId)
            : arrayRemove(selectedScreenId),
        });
      } catch (error) {
        console.error("[SignTvPanel] failed to update assignment", error);
        toast.error("Failed to update assignment");
      }
    },
    [firebase.db, selectedScreenId, resolvedUserId],
  );

  const deleteImage = useCallback(
    async (image: TvImage) => {
      if (!resolvedUserId) return;

      try {
        await deleteDoc(doc(firebase.db, "users", resolvedUserId, "images", image.id));
        if (image.storagePath) {
          const objectRef = storageRef(firebase.storage, image.storagePath);
          await deleteObject(objectRef);
        }
        toast.success("Image deleted");
      } catch (error) {
        console.error("[SignTvPanel] failed to delete image", error);
        toast.error("Failed to delete image");
      }
    },
    [firebase.db, firebase.storage, resolvedUserId],
  );

  if (!resolvedUserId && !locationsLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6">
        <Text className="text-white/70">
          Sign TV is not configured. Add <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SIGNTV_USER_ID</code> to your environment variables.
        </Text>
      </div>
    );
  }

  if (locationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (availableLocations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-center">
        <Text className="text-white/70">No Sign TV screens found.</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen Selector */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <Field>
              <Label className="text-white/60">Select Screen</Label>
              <Select
                value={selectedScreenId}
                onChange={(e) => setSelectedScreenId(e.target.value)}
                className="mt-1"
              >
                {availableLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.id}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="emerald" className="whitespace-nowrap">
              {availableLocations.length} screen{availableLocations.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      ) : !selectedScreenId ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-center">
          <Text className="text-white/70">Select a screen to manage.</Text>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={clsx(
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "settings"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/80",
              )}
            >
              Display Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("images")}
              className={clsx(
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "images"
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/80",
              )}
            >
              Images
              {assignedImages.filter((img) => img.assigned && !img.hidden).length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-xs text-emerald-400">
                  {assignedImages.filter((img) => img.assigned && !img.hidden).length}
                </span>
              )}
            </button>
          </div>

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg">
                <div className="mb-5 flex items-center justify-between">
                  <Text className="text-lg font-semibold text-white">
                    {form?.name || "Screen Settings"}
                  </Text>
                  <Button color="red" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                <div className="space-y-5">
                  {/* Screen Name */}
                  <Field>
                    <Label>Screen Name</Label>
                    <Input
                      type="text"
                      value={form?.name ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...(prev ?? { id: selectedScreenId }),
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter screen name"
                    />
                  </Field>

                  {/* Ticker Text */}
                  <Field>
                    <Label>Ticker Message</Label>
                    <Textarea
                      rows={2}
                      value={form?.tickerText ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...(prev ?? { id: selectedScreenId }),
                          tickerText: e.target.value,
                        }))
                      }
                      placeholder="Enter scrolling ticker text"
                    />
                  </Field>

                  {/* Display Options */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <Text className="mb-4 text-sm font-medium text-white/80">Display Options</Text>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field>
                        <Label>Orientation</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).tvMounted}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                tvMounted: e.target.value as TvSettings["tvMounted"],
                              },
                            }))
                          }
                        >
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Rotation</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).tvRotationDirection}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                tvRotationDirection: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="translate(-50%, -50%) rotate(-90deg)">Rotate Left</option>
                          <option value="translate(-50%, -50%) rotate(90deg)">Rotate Right</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Ticker Position</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).tickerDisplay}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                tickerDisplay: e.target.value as TvSettings["tickerDisplay"],
                              },
                            }))
                          }
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="hidden">Hidden</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Ticker Size</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).tickerSize}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                tickerSize: e.target.value as TvSettings["tickerSize"],
                              },
                            }))
                          }
                        >
                          <option value="xs">Extra Small</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                          <option value="xl">Extra Large</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Ticker Theme</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).tickerTheme}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                tickerTheme: e.target.value as TvSettings["tickerTheme"],
                              },
                            }))
                          }
                        >
                          <option value="blue">Blue</option>
                          <option value="red">Red</option>
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Background</Label>
                        <Select
                          value={resolveSettings(form?.tvSettings).backgroundColor}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...(prev ?? { id: selectedScreenId }),
                              tvSettings: {
                                ...resolveSettings(prev?.tvSettings),
                                backgroundColor: e.target.value as TvSettings["backgroundColor"],
                              },
                            }))
                          }
                        >
                          <option value="blue">Blue</option>
                          <option value="red">Red</option>
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                        </Select>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === "images" && (
            <div className="space-y-4">
              {/* Upload Section */}
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Text className="text-lg font-semibold text-white">Upload Images</Text>
                    <Text className="text-sm text-white/60">
                      Upload to the shared image bank. Assign images to this screen below.
                    </Text>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10",
                        uploading && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {uploading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Choose Files
                        </>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Images Grid */}
              {imagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              ) : images.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-zinc-950/50 p-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                    <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <Text className="text-white/70">No images yet</Text>
                  <Text className="mt-1 text-sm text-white/50">
                    Upload images to display on this screen
                  </Text>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assignedImages.map((image) => (
                    <div
                      key={image.id}
                      className={clsx(
                        "group relative overflow-hidden rounded-xl border bg-zinc-950/70 transition-all",
                        image.assigned && !image.hidden
                          ? "border-emerald-500/30"
                          : "border-white/10",
                      )}
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-video overflow-hidden bg-black/40">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.url}
                            alt={image.name || "Sign TV image"}
                            className={clsx(
                              "h-full w-full object-contain transition-opacity",
                              image.hidden && "opacity-40",
                            )}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Status Badges */}
                        <div className="absolute left-2 top-2 flex gap-1.5">
                          {image.assigned && !image.hidden && (
                            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-medium text-white">
                              Active
                            </span>
                          )}
                          {image.hidden && (
                            <span className="rounded-full bg-zinc-700/90 px-2 py-0.5 text-xs font-medium text-white/70">
                              Hidden
                            </span>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Delete this image?")) {
                              void deleteImage(image);
                            }
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/70 opacity-0 transition-opacity hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Image Controls */}
                      <div className="p-3">
                        <Text className="mb-3 truncate text-sm text-white/80">
                          {image.name || "Untitled"}
                        </Text>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={image.assigned}
                              onChange={(value) => void toggleImageAssignment(image, value)}
                            />
                            <Text className="text-xs text-white/60">
                              {image.assigned ? "Assigned" : "Not assigned"}
                            </Text>
                          </div>

                          <button
                            type="button"
                            onClick={() => void toggleImageVisibility(image.id, image.hidden ?? false)}
                            className={clsx(
                              "rounded-md px-2 py-1 text-xs transition-colors",
                              image.hidden
                                ? "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                            )}
                          >
                            {image.hidden ? "Show" : "Visible"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
