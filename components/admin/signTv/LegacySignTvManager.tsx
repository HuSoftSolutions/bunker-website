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

type LegacyTvSettings = {
  tvMounted?: "portrait" | "landscape";
  tvRotationDirection?: string;
  tickerDisplay?: "top" | "bottom" | "hidden";
  tickerSize?: "xs" | "sm" | "md" | "lg" | "xl";
  tickerTheme?: "light" | "dark" | "red" | "blue";
  backgroundColor?: "light" | "dark" | "red" | "blue";
};

type LegacyLocation = {
  id: string;
  name?: string;
  tickerText?: string;
  tvSettings?: LegacyTvSettings;
};

type LegacyImage = {
  id: string;
  url: string;
  name?: string;
  hidden?: boolean;
  locations?: string[];
  storagePath?: string;
};

const DEFAULT_TV_SETTINGS: LegacyTvSettings = {
  tvMounted: "landscape",
  tvRotationDirection: "translate(-50%, -50%) rotate(-90deg)",
  tickerDisplay: "bottom",
  tickerSize: "md",
  tickerTheme: "blue",
  backgroundColor: "blue",
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveSettings = (value?: LegacyTvSettings): LegacyTvSettings => ({
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

type LegacySignTvManagerProps = {
  firebase: SignTvFirebase;
  locationId: string;
  locationName?: string;
  userId?: string;
};

export function LegacySignTvManager({
  firebase,
  locationId,
  locationName,
  userId: userIdOverride,
}: LegacySignTvManagerProps) {
  const [location, setLocation] = useState<LegacyLocation | null>(null);
  const [form, setForm] = useState<LegacyLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<LegacyImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resolvedLocationId, setResolvedLocationId] = useState<string>("");

  const userId = userIdOverride || SIGNTV_USER_ID;

  useEffect(() => {
    if (!userId) {
      setResolvedLocationId("");
      return;
    }

    const locationsRef = collection(firebase.db, "users", userId, "locations");
    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: resolveStringValue(docSnap.data()?.name),
        }));

        const directMatch = docs.find((doc) => doc.id === locationId);
        if (directMatch) {
          setResolvedLocationId(directMatch.id);
          return;
        }

        const mappedNames =
          SIGNTV_LOCATION_NAME_MAP[normalizeLocationKey(locationId)] ?? [];

        if (mappedNames.length) {
          const normalized = mappedNames.map((name) => name.toLowerCase().trim());
          const mappedMatch = docs.find((doc) =>
            normalized.includes(doc.name.toLowerCase().trim()),
          );
          if (mappedMatch) {
            setResolvedLocationId(mappedMatch.id);
            return;
          }
        }

        if (locationName) {
          const nameMatch = docs.find(
            (doc) =>
              doc.name.toLowerCase().trim() ===
              locationName.toLowerCase().trim(),
          );
          if (nameMatch) {
            setResolvedLocationId(nameMatch.id);
            return;
          }
        }

        setResolvedLocationId(locationId);
      },
      (error) => {
        console.error("[LegacySignTvManager] failed to resolve location", error);
        setResolvedLocationId(locationId);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, locationId, locationName, userId]);

  useEffect(() => {
    if (!userId || !resolvedLocationId) {
      setLocation(null);
      setForm(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const locationRef = doc(
      firebase.db,
      "users",
      userId,
      "locations",
      resolvedLocationId,
    );
    const unsubscribe = onSnapshot(
      locationRef,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const nextLocation: LegacyLocation = {
          id: resolvedLocationId,
          name: resolveStringValue(data?.name, "Location"),
          tickerText: resolveStringValue(data?.tickerText),
          tvSettings: resolveSettings(data?.tvSettings),
        };
        setLocation(nextLocation);
        setForm(nextLocation);
        setLoading(false);
      },
      (error) => {
        console.error("[LegacySignTvManager] failed to load location", error);
        setLocation(null);
        setForm(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, resolvedLocationId, userId]);

  useEffect(() => {
    if (!userId) {
      setImages([]);
      setImagesLoading(false);
      return undefined;
    }

    setImagesLoading(true);
    const imagesRef = collection(firebase.db, "users", userId, "images");
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
          } satisfies LegacyImage;
        });
        setImages(next);
        setImagesLoading(false);
      },
      (error) => {
        console.error("[LegacySignTvManager] failed to load images", error);
        setImages([]);
        setImagesLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, userId]);

  const visibleImages = useMemo(
    () =>
      images.map((image) => ({
        ...image,
        assigned: resolvedLocationId
          ? resolveLocations(image.locations).includes(resolvedLocationId)
          : false,
      })),
    [images, resolvedLocationId],
  );

  const handleSave = useCallback(async () => {
    if (!userId || !resolvedLocationId || !form) {
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(firebase.db, "users", userId, "locations", resolvedLocationId),
        {
          name: resolveStringValue(form.name, "Location"),
          tickerText: resolveStringValue(form.tickerText),
          tvSettings: resolveSettings(form.tvSettings),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("Sign TV settings saved.");
    } catch (error) {
      console.error("[LegacySignTvManager] failed to save", error);
      toast.error("Unable to save sign TV settings.");
    } finally {
      setSaving(false);
    }
  }, [firebase.db, form, resolvedLocationId, userId]);

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !userId) {
        return;
      }

      setUploading(true);
      const imagesRef = collection(firebase.db, "users", userId, "images");

      try {
        const uploadTasks = Array.from(files).map(async (file) => {
          const safeName = file.name.replace(/\s+/g, "-");
          const storagePath = `images/${userId}/${Date.now()}-${safeName}`;
          const objectRef = storageRef(firebase.storage, storagePath);

          await uploadBytes(objectRef, file, { contentType: file.type });
          const url = await getDownloadURL(objectRef);

          await setDoc(doc(imagesRef), {
            url,
            name: file.name,
            hidden: false,
            locations: resolvedLocationId ? [resolvedLocationId] : [],
            userId,
            storagePath,
            timestamp: serverTimestamp(),
          });
        });

        await Promise.all(uploadTasks);
        toast.success("Images uploaded.");
      } catch (error) {
        console.error("[LegacySignTvManager] upload failed", error);
        toast.error("Upload failed. Try again.");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [firebase.db, firebase.storage, resolvedLocationId, userId],
  );

  const updateImage = useCallback(
    async (imageId: string, payload: Partial<LegacyImage>) => {
      if (!userId) {
        return;
      }

      try {
        await updateDoc(doc(firebase.db, "users", userId, "images", imageId), payload);
      } catch (error) {
        console.error("[LegacySignTvManager] failed to update image", error);
        toast.error("Could not update image.");
      }
    },
    [firebase.db, userId],
  );

  const toggleAssignment = useCallback(
    async (image: LegacyImage, assign: boolean) => {
      if (!userId || !resolvedLocationId) {
        return;
      }

      try {
        await updateDoc(doc(firebase.db, "users", userId, "images", image.id), {
          locations: assign
            ? arrayUnion(resolvedLocationId)
            : arrayRemove(resolvedLocationId),
        });
      } catch (error) {
        console.error("[LegacySignTvManager] failed to update assignments", error);
        toast.error("Could not update assignment.");
      }
    },
    [firebase.db, resolvedLocationId, userId],
  );

  const deleteImage = useCallback(
    async (image: LegacyImage) => {
      if (!userId) {
        return;
      }

      try {
        await deleteDoc(doc(firebase.db, "users", userId, "images", image.id));
        if (image.storagePath) {
          const objectRef = storageRef(firebase.storage, image.storagePath);
          await deleteObject(objectRef);
        }
      } catch (error) {
        console.error("[LegacySignTvManager] failed to delete image", error);
        toast.error("Could not delete image.");
      }
    },
    [firebase.db, firebase.storage, userId],
  );

  if (!userId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <Text className="text-sm text-white/70">
          Missing `NEXT_PUBLIC_SIGNTV_USER_ID`. Add it to `.env.local` to manage
          Sign TV data.
        </Text>
      </div>
    );
  }

  if (loading) {
    return <Text className="text-sm text-white/60">Loading sign TV…</Text>;
  }

  if (!resolvedLocationId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <Text className="text-sm text-white/70">
          Could not resolve a Sign TV location for{" "}
          {locationName ?? locationId}. Check the mapping in the Sign TV
          database.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="space-y-2">
          <Text className="text-sm text-white/70">
            Managing legacy Sign TV data for user {userId}.
          </Text>
          <Text className="text-xs text-white/50">
            Changes save to the Sign TV Firebase project.
          </Text>
          {resolvedLocationId !== locationId ? (
            <Text className="text-xs text-white/50">
              Mapped {locationName ?? locationId} to Sign TV location{" "}
              {resolvedLocationId}.
            </Text>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-lg font-semibold text-white">
              Location Settings
            </Text>
            <Text className="text-sm text-white/60">
              Update the ticker text and TV settings for this location.
            </Text>
          </div>
          <Button color="red" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg space-y-4">
          <Field>
            <Label>Location Name</Label>
            <Input
              type="text"
              value={form?.name ?? location?.name ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...(prev ?? { id: resolvedLocationId }),
                  name: event.target.value,
                }))
              }
            />
          </Field>

          <Field>
            <Label>Ticker Text</Label>
            <Textarea
              rows={2}
              value={form?.tickerText ?? location?.tickerText ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...(prev ?? { id: resolvedLocationId }),
                  tickerText: event.target.value,
                }))
              }
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label>TV Mounted</Label>
              <Select
                value={resolveSettings(form?.tvSettings).tvMounted}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      tvMounted: event.target.value as LegacyTvSettings["tvMounted"],
                    },
                  }))
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </Select>
            </Field>

            <Field>
              <Label>Rotation Direction</Label>
              <Select
                value={resolveSettings(form?.tvSettings).tvRotationDirection}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      tvRotationDirection: event.target.value,
                    },
                  }))
                }
              >
                <option value="translate(-50%, -50%) rotate(-90deg)">Left</option>
                <option value="translate(-50%, -50%) rotate(90deg)">Right</option>
              </Select>
            </Field>

            <Field>
              <Label>Ticker Display</Label>
              <Select
                value={resolveSettings(form?.tvSettings).tickerDisplay}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      tickerDisplay: event.target.value as LegacyTvSettings["tickerDisplay"],
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
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      tickerSize: event.target.value as LegacyTvSettings["tickerSize"],
                    },
                  }))
                }
              >
                <option value="xs">X-Small</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">X-Large</option>
              </Select>
            </Field>

            <Field>
              <Label>Ticker Theme</Label>
              <Select
                value={resolveSettings(form?.tvSettings).tickerTheme}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      tickerTheme: event.target.value as LegacyTvSettings["tickerTheme"],
                    },
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </Select>
            </Field>

            <Field>
              <Label>Background Color</Label>
              <Select
                value={resolveSettings(form?.tvSettings).backgroundColor}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...(prev ?? { id: resolvedLocationId }),
                    tvSettings: {
                      ...resolveSettings(prev?.tvSettings),
                      backgroundColor: event.target.value as LegacyTvSettings["backgroundColor"],
                    },
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-lg font-semibold text-white">Images</Text>
            <Text className="text-sm text-white/60">
              Upload to the shared image bank. Assign images to this screen below.
            </Text>
          </div>
          <Input type="file" multiple onChange={handleUpload} disabled={uploading} />
        </div>

        {imagesLoading ? (
          <Text className="text-sm text-white/60">Loading images…</Text>
        ) : visibleImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
            <Text className="text-sm text-white/70">
              No images yet. Upload graphics to start rotating them on TVs.
            </Text>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleImages.map((image) => {
              const isHidden = Boolean(image.hidden);
              return (
                <div
                  key={image.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-40 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.url}
                            alt={image.name || "Sign TV image"}
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Text className="text-sm text-white">
                          {image.name || "Untitled image"}
                        </Text>
                        <Badge color={isHidden ? "zinc" : "emerald"}>
                          {isHidden ? "Hidden" : "Visible"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Switch
                        checked={!isHidden}
                        onChange={(value) =>
                          void updateImage(image.id, { hidden: !value })
                        }
                      />
                      <Text className="text-xs text-white/60">
                        {isHidden ? "Hidden" : "Visible"}
                      </Text>
                      <Button outline onClick={() => void deleteImage(image)}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Switch
                        checked={image.assigned}
                        onChange={(value) => void toggleAssignment(image, value)}
                        disabled={!resolvedLocationId}
                      />
                      <Text className="text-xs text-white/60">
                        Assigned to this location
                      </Text>
                    </div>
                    {!resolvedLocationId ? (
                      <Text className="text-xs text-white/50">
                        Select a location to assign images.
                      </Text>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
