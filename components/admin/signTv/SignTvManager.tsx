"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { SIGNTV, SIGN_TV_BUSINESS_ID } from "@/constants/routes";
import { Button } from "@/ui-kit/button";
import { Input } from "@/ui-kit/input";
import { Textarea } from "@/ui-kit/textarea";
import { Select } from "@/ui-kit/select";
import { Switch } from "@/ui-kit/switch";
import { Text } from "@/ui-kit/text";
import { Badge } from "@/ui-kit/badge";
import { Checkbox, CheckboxField } from "@/ui-kit/checkbox";
import { Field, Label } from "@/ui-kit/fieldset";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { toast } from "react-toastify";

type SignTvSettings = {
  tvMounted?: "portrait" | "landscape";
  tvRotationDirection?: string;
  tickerDisplay?: "top" | "bottom" | "hidden";
  tickerSize?: "xs" | "sm" | "md" | "lg" | "xl";
  tickerTheme?: "light" | "dark" | "red" | "blue";
  backgroundColor?: "light" | "dark" | "red" | "blue";
};

type SignTv = {
  id: string;
  name: string;
  tickerText?: string;
  settings?: SignTvSettings;
};

type SignTvGraphic = {
  id: string;
  url: string;
  name?: string;
  storagePath?: string;
  hidden?: boolean;
  tvIds?: string[];
  applyToAll?: boolean;
};

type BusinessSignTvGraphic = {
  id: string;
  url: string;
  name?: string;
  storagePath?: string;
  hidden?: boolean;
  locationIds?: string[];
  applyToAllLocations?: boolean;
  locationTvIds?: Record<string, string[]>;
};

const DEFAULT_TV_SETTINGS: SignTvSettings = {
  tvMounted: "landscape",
  tvRotationDirection: "translate(-50%, -50%) rotate(-90deg)",
  tickerDisplay: "bottom",
  tickerSize: "md",
  tickerTheme: "blue",
  backgroundColor: "blue",
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveSignTvSettings = (value?: SignTvSettings): SignTvSettings => ({
  ...DEFAULT_TV_SETTINGS,
  ...(value ?? {}),
});

const resolveSignTvs = (value: unknown): SignTv[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is SignTv =>
        Boolean(entry) && typeof entry === "object" && "id" in entry,
    )
    .map((entry) => ({
      id: resolveStringValue(entry.id, ""),
      name: resolveStringValue(entry.name, "Sign TV"),
      tickerText: resolveStringValue(entry.tickerText),
      settings: resolveSignTvSettings(entry.settings),
    }))
    .filter((entry) => entry.id);
};

const resolveGraphicAssignments = (graphic: SignTvGraphic) => ({
  applyToAll: Boolean(graphic.applyToAll),
  tvIds: Array.isArray(graphic.tvIds)
    ? graphic.tvIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [],
});

const resolveBusinessTvAssignments = (
  graphic: BusinessSignTvGraphic,
  locationId: string,
  tvs: SignTv[],
) => {
  if (!locationId) {
    return [];
  }

  const assignments =
    graphic.locationTvIds &&
    typeof graphic.locationTvIds === "object" &&
    Object.prototype.hasOwnProperty.call(graphic.locationTvIds, locationId)
      ? graphic.locationTvIds[locationId]
      : null;

  if (Array.isArray(assignments)) {
    return assignments.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
  }

  const legacyApplyAll = Boolean(graphic.applyToAllLocations);
  const legacyLocations = Array.isArray(graphic.locationIds)
    ? graphic.locationIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];

  if (legacyApplyAll || legacyLocations.includes(locationId)) {
    return tvs.map((tv) => tv.id).filter(Boolean);
  }

  return [];
};

const generateSignTvId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

type SignTvManagerProps = {
  firebase: Firebase;
  locationId: string;
  locationName: string;
  signTvs: unknown;
  mode?: "location" | "business";
  canManageTvs?: boolean;
  canManageBusinessGraphics?: boolean;
  canManageLocationGraphics?: boolean;
  canAssignBusinessGraphics?: boolean;
  onChangeSignTvs: (next: SignTv[]) => void;
};

export function SignTvManager({
  firebase,
  locationId,
  locationName,
  signTvs,
  mode = "location",
  canManageTvs = true,
  canManageBusinessGraphics,
  canManageLocationGraphics = true,
  canAssignBusinessGraphics = true,
  onChangeSignTvs,
}: SignTvManagerProps) {
  const [graphics, setGraphics] = useState<SignTvGraphic[]>([]);
  const [graphicsLoading, setGraphicsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [businessGraphics, setBusinessGraphics] = useState<BusinessSignTvGraphic[]>([]);
  const [businessGraphicsLoading, setBusinessGraphicsLoading] = useState(true);
  const [businessUploading, setBusinessUploading] = useState(false);
  const [origin, setOrigin] = useState("");

  const tvs = useMemo(() => resolveSignTvs(signTvs), [signTvs]);
  const resolvedBusinessId = SIGN_TV_BUSINESS_ID;
  const isBusinessMode = mode === "business";
  const allowBusinessGraphics = canManageBusinessGraphics ?? isBusinessMode;

  useEffect(() => {
    if (!Array.isArray(signTvs)) {
      return;
    }

    const needsIds = signTvs.some(
      (tv) => !tv || typeof tv !== "object" || !("id" in tv) || !tv.id,
    );

    if (!needsIds) {
      return;
    }

    const normalized = signTvs.map((tv) => {
      const record =
        tv && typeof tv === "object" ? (tv as Record<string, unknown>) : {};
      return {
        ...record,
        id: resolveStringValue(record.id) || generateSignTvId(),
        name: resolveStringValue(record.name, "Sign TV"),
      };
    });

    onChangeSignTvs(normalized as SignTv[]);
  }, [onChangeSignTvs, signTvs]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!locationId) {
      setGraphics([]);
      setGraphicsLoading(false);
      return undefined;
    }

    const graphicsRef = collection(
      firebase.db,
      "locations",
      locationId,
      "signTvGraphics",
    );

    setGraphicsLoading(true);
    const unsubscribe = onSnapshot(
      graphicsRef,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: resolveStringValue(data?.url),
            name: resolveStringValue(data?.name),
            storagePath: resolveStringValue(data?.storagePath),
            hidden: Boolean(data?.hidden),
            tvIds: Array.isArray(data?.tvIds) ? data.tvIds : [],
            applyToAll: Boolean(data?.applyToAll),
          } satisfies SignTvGraphic;
        });

        setGraphics(next);
        setGraphicsLoading(false);
      },
      (error) => {
        console.error("[SignTvManager] failed to load graphics", error);
        setGraphicsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, locationId]);

  useEffect(() => {
    if (!resolvedBusinessId) {
      setBusinessGraphics([]);
      setBusinessGraphicsLoading(false);
      return undefined;
    }

    const graphicsRef = collection(
      firebase.db,
      "signTvBusinesses",
      resolvedBusinessId,
      "graphics",
    );

    setBusinessGraphicsLoading(true);
    const unsubscribe = onSnapshot(
      graphicsRef,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: resolveStringValue(data?.url),
            name: resolveStringValue(data?.name),
            storagePath: resolveStringValue(data?.storagePath),
            hidden: Boolean(data?.hidden),
            locationIds: Array.isArray(data?.locationIds) ? data.locationIds : [],
            applyToAllLocations: Boolean(data?.applyToAllLocations),
            locationTvIds:
              data?.locationTvIds && typeof data.locationTvIds === "object"
                ? (data.locationTvIds as Record<string, string[]>)
                : {},
          } satisfies BusinessSignTvGraphic;
        });

        setBusinessGraphics(next);
        setBusinessGraphicsLoading(false);
      },
      (error) => {
        console.error("[SignTvManager] failed to load business graphics", error);
        setBusinessGraphicsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, resolvedBusinessId]);

  const addTv = useCallback(() => {
    if (!canManageTvs) {
      return;
    }
    const nextIndex = tvs.length + 1;
    const nextTv: SignTv = {
      id: generateSignTvId(),
      name: `Sign TV ${nextIndex}`,
      tickerText: "",
      settings: { ...DEFAULT_TV_SETTINGS },
    };

    onChangeSignTvs([...tvs, nextTv]);
  }, [canManageTvs, onChangeSignTvs, tvs]);

  const updateTv = useCallback(
    (id: string, patch: Partial<SignTv>) => {
      if (!canManageTvs) {
        return;
      }
      onChangeSignTvs(
        tvs.map((tv) => (tv.id === id ? { ...tv, ...patch } : tv)),
      );
    },
    [canManageTvs, onChangeSignTvs, tvs],
  );

  const updateTvSettings = useCallback(
    (id: string, field: keyof SignTvSettings, value: string) => {
      if (!canManageTvs) {
        return;
      }
      onChangeSignTvs(
        tvs.map((tv) => {
          if (tv.id !== id) {
            return tv;
          }

          const nextSettings = {
            ...resolveSignTvSettings(tv.settings),
            [field]: value,
          };

          return { ...tv, settings: nextSettings };
        }),
      );
    },
    [canManageTvs, onChangeSignTvs, tvs],
  );

  const removeTv = useCallback(
    async (id: string) => {
      if (!canManageTvs) {
        return;
      }
      onChangeSignTvs(tvs.filter((tv) => tv.id !== id));

      if (!locationId) {
        return;
      }

      const updates = graphics
        .filter((graphic) => {
          const assignments = resolveGraphicAssignments(graphic);
          return !assignments.applyToAll && assignments.tvIds.includes(id);
        })
        .map((graphic) => {
          const assignments = resolveGraphicAssignments(graphic);
          const nextIds = assignments.tvIds.filter((tvId) => tvId !== id);
          return updateDoc(
            doc(
              firebase.db,
              "locations",
              locationId,
              "signTvGraphics",
              graphic.id,
            ),
            {
              tvIds: nextIds,
            },
          );
        });

      if (updates.length) {
        try {
          await Promise.all(updates);
        } catch (error) {
          console.error("[SignTvManager] failed to update graphics", error);
          toast.error("Unable to update graphics for the removed TV.");
        }
      }
    },
    [canManageTvs, firebase.db, graphics, locationId, onChangeSignTvs, tvs],
  );

  const handleLocationUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!canManageLocationGraphics) {
        return;
      }
      const files = event.target.files;
      if (!files || !locationId) {
        return;
      }

      setUploading(true);
      const graphicsRef = collection(
        firebase.db,
        "locations",
        locationId,
        "signTvGraphics",
      );

      try {
        const uploadTasks = Array.from(files).map(async (file) => {
          const safeName = file.name.replace(/\s+/g, "-");
          const storagePath = `sign-tv/${locationId}/${Date.now()}-${safeName}`;
          const objectRef = storageRef(firebase.storage, storagePath);

          await uploadBytes(objectRef, file, { contentType: file.type });
          const url = await getDownloadURL(objectRef);

          await addDoc(graphicsRef, {
            url,
            name: file.name,
            storagePath,
            hidden: false,
            applyToAll: true,
            tvIds: [],
            createdAt: serverTimestamp(),
          });
        });

        await Promise.all(uploadTasks);
        toast.success("Graphics uploaded.");
      } catch (error) {
        console.error("[SignTvManager] upload failed", error);
        toast.error("Upload failed. Try again.");
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [canManageLocationGraphics, firebase.db, firebase.storage, locationId],
  );

  const handleBusinessUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!allowBusinessGraphics) {
        return;
      }
      const files = event.target.files;
      if (!files || !resolvedBusinessId) {
        return;
      }

      setBusinessUploading(true);
      const graphicsRef = collection(
        firebase.db,
        "signTvBusinesses",
        resolvedBusinessId,
        "graphics",
      );

      try {
        const uploadTasks = Array.from(files).map(async (file) => {
          const safeName = file.name.replace(/\s+/g, "-");
          const storagePath = `sign-tv/business/${resolvedBusinessId}/${Date.now()}-${safeName}`;
          const objectRef = storageRef(firebase.storage, storagePath);

          await uploadBytes(objectRef, file, { contentType: file.type });
          const url = await getDownloadURL(objectRef);

          await addDoc(graphicsRef, {
            url,
            name: file.name,
            storagePath,
            hidden: false,
            applyToAllLocations: false,
            locationIds: [],
            locationTvIds: {},
            createdAt: serverTimestamp(),
          });
        });

        await Promise.all(uploadTasks);
        toast.success("Business graphics uploaded.");
      } catch (error) {
        console.error("[SignTvManager] business upload failed", error);
        toast.error("Business upload failed. Try again.");
      } finally {
        setBusinessUploading(false);
        event.target.value = "";
      }
    },
    [allowBusinessGraphics, firebase.db, firebase.storage, resolvedBusinessId],
  );

  const updateGraphic = useCallback(
    async (graphicId: string, payload: Partial<SignTvGraphic>) => {
      if (!locationId || !canManageLocationGraphics) {
        return;
      }

      try {
        await updateDoc(
          doc(firebase.db, "locations", locationId, "signTvGraphics", graphicId),
          payload,
        );
      } catch (error) {
        console.error("[SignTvManager] failed to update graphic", error);
        toast.error("Could not update graphic.");
      }
    },
    [canManageLocationGraphics, firebase.db, locationId],
  );

  const updateBusinessGraphic = useCallback(
    async (
      graphicId: string,
      payload: Partial<BusinessSignTvGraphic>,
    ) => {
      if (
        !resolvedBusinessId ||
        (!allowBusinessGraphics && !canAssignBusinessGraphics)
      ) {
        return;
      }

      try {
        await updateDoc(
          doc(
            firebase.db,
            "signTvBusinesses",
            resolvedBusinessId,
            "graphics",
            graphicId,
          ),
          payload,
        );
      } catch (error) {
        console.error("[SignTvManager] failed to update business graphic", error);
        toast.error("Could not update business graphic.");
      }
    },
    [allowBusinessGraphics, canAssignBusinessGraphics, firebase.db, resolvedBusinessId],
  );

  const updateBusinessAssignments = useCallback(
    async (graphicId: string, tvIds: string[]) => {
      if (!resolvedBusinessId || !locationId || !canAssignBusinessGraphics) {
        return;
      }

      try {
        await updateDoc(
          doc(
            firebase.db,
            "signTvBusinesses",
            resolvedBusinessId,
            "graphics",
            graphicId,
          ),
          {
            [`locationTvIds.${locationId}`]: tvIds,
          },
        );
      } catch (error) {
        console.error("[SignTvManager] failed to update business assignments", error);
        toast.error("Could not update business assignments.");
      }
    },
    [canAssignBusinessGraphics, firebase.db, locationId, resolvedBusinessId],
  );

  const deleteGraphic = useCallback(
    async (graphic: SignTvGraphic) => {
      if (!locationId || !canManageLocationGraphics) {
        return;
      }

      try {
        await deleteDoc(
          doc(firebase.db, "locations", locationId, "signTvGraphics", graphic.id),
        );

        if (graphic.storagePath) {
          const objectRef = storageRef(firebase.storage, graphic.storagePath);
          await deleteObject(objectRef);
        }
      } catch (error) {
        console.error("[SignTvManager] failed to delete graphic", error);
        toast.error("Could not delete graphic.");
      }
    },
    [canManageLocationGraphics, firebase.db, firebase.storage, locationId],
  );

  const deleteBusinessGraphic = useCallback(
    async (graphic: BusinessSignTvGraphic) => {
      if (!resolvedBusinessId || !allowBusinessGraphics) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            firebase.db,
            "signTvBusinesses",
            resolvedBusinessId,
            "graphics",
            graphic.id,
          ),
        );

        if (graphic.storagePath) {
          const objectRef = storageRef(firebase.storage, graphic.storagePath);
          await deleteObject(objectRef);
        }
      } catch (error) {
        console.error("[SignTvManager] failed to delete business graphic", error);
        toast.error("Could not delete business graphic.");
      }
    },
    [allowBusinessGraphics, firebase.db, firebase.storage, resolvedBusinessId],
  );

  const publicUrlFor = useCallback(
    (tvId: string) => {
      const base = origin || "";
      return `${base}${SIGNTV}/${resolvedBusinessId}/${locationId}/${tvId}`;
    },
    [locationId, origin, resolvedBusinessId],
  );

  const copyPublicUrl = useCallback(
    async (tvId: string) => {
      const url = publicUrlFor(tvId);
      if (!url || typeof navigator === "undefined") {
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        toast.success("Public URL copied.");
      } catch (error) {
        console.error("[SignTvManager] failed to copy URL", error);
        toast.error("Unable to copy URL.");
      }
    },
    [publicUrlFor],
  );

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="space-y-4">
          <Text className="text-sm text-white/70">
            Configure each sign TV at {locationName || "this location"}.
          </Text>
          <Text className="text-xs text-white/60">
            Public URL format: {SIGNTV}/{resolvedBusinessId}/{locationId || "location-slug"}/tv-id
          </Text>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-lg font-semibold text-white">Sign TVs</Text>
            <Text className="text-sm text-white/60">
              Add, remove, and configure screens for this location.
            </Text>
            {!canManageTvs ? (
              <Text className="mt-1 text-xs text-white/50">
                Only admins can add, edit, or remove TVs.
              </Text>
            ) : null}
          </div>
          <Button onClick={addTv} disabled={!canManageTvs}>
            Add Sign TV
          </Button>
        </div>

        {!tvs.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
            <Text className="text-sm text-white/70">
              No sign TVs yet. Add one to start configuring displays.
            </Text>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tvs.map((tv) => {
              const settings = resolveSignTvSettings(tv.settings);
              const publicUrl = publicUrlFor(tv.id);

              return (
                <div
                  key={tv.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Input
                        type="text"
                        value={tv.name}
                        onChange={(event) =>
                          updateTv(tv.id, { name: event.target.value })
                        }
                        disabled={!canManageTvs}
                      />
                      <Text className="text-xs text-white/60">
                        Public ID: <span className="text-white/90">{tv.id}</span>
                      </Text>
                    </div>
                    <Button
                      outline
                      onClick={() => removeTv(tv.id)}
                      disabled={!canManageTvs}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <Text className="text-xs uppercase tracking-wide text-white/50">
                        Public URL
                      </Text>
                      <Text className="mt-1 break-all text-sm text-white">
                        {publicUrl}
                      </Text>
                      <div className="mt-2">
                        <Button outline onClick={() => copyPublicUrl(tv.id)}>
                          Copy URL
                        </Button>
                      </div>
                    </div>

                    <Field>
                      <Label>Ticker Text</Label>
                      <Textarea
                        rows={2}
                        value={tv.tickerText ?? ""}
                        onChange={(event) =>
                          updateTv(tv.id, { tickerText: event.target.value })
                        }
                        disabled={!canManageTvs}
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <Label>TV Mounted</Label>
                        <Select
                          value={settings.tvMounted}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "tvMounted",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Rotation Direction</Label>
                        <Select
                          value={settings.tvRotationDirection}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "tvRotationDirection",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
                        >
                          <option value="translate(-50%, -50%) rotate(-90deg)">
                            Left
                          </option>
                          <option value="translate(-50%, -50%) rotate(90deg)">
                            Right
                          </option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Ticker Display</Label>
                        <Select
                          value={settings.tickerDisplay}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "tickerDisplay",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="hidden">Hidden</option>
                        </Select>
                      </Field>

                      <Field>
                        <Label>Ticker Size</Label>
                        <Select
                          value={settings.tickerSize}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "tickerSize",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
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
                          value={settings.tickerTheme}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "tickerTheme",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
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
                          value={settings.backgroundColor}
                          onChange={(event) =>
                            updateTvSettings(
                              tv.id,
                              "backgroundColor",
                              event.target.value,
                            )
                          }
                          disabled={!canManageTvs}
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
              );
            })}
          </div>
        )}
      </div>

      {mode === "location" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Text className="text-lg font-semibold text-white">
                Location Graphics
              </Text>
              <Text className="text-sm text-white/60">
                Upload graphics and assign them to one or more TVs.
              </Text>
            </div>
            {canManageLocationGraphics ? (
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  multiple
                  onChange={handleLocationUpload}
                  disabled={uploading || !locationId}
                />
              </div>
            ) : null}
          </div>

          {graphicsLoading ? (
            <Text className="text-sm text-white/60">Loading graphics…</Text>
          ) : graphics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
              <Text className="text-sm text-white/70">
                No graphics yet. Upload images to start rotating them on TVs.
              </Text>
            </div>
          ) : (
            <div className="space-y-4">
              {graphics.map((graphic) => {
                const assignments = resolveGraphicAssignments(graphic);
                const isHidden = Boolean(graphic.hidden);

                return (
                  <div
                    key={graphic.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-24 w-40 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                          {graphic.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={graphic.url}
                              alt={graphic.name || "Sign TV graphic"}
                              className="h-full w-full object-contain"
                            />
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <Text className="text-sm text-white">
                            {graphic.name || "Untitled graphic"}
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
                            void updateGraphic(graphic.id, { hidden: !value })
                          }
                          disabled={!canManageLocationGraphics}
                        />
                        <Text className="text-xs text-white/60">
                          {isHidden ? "Hidden" : "Visible"}
                        </Text>
                        <Button
                          outline
                          onClick={() => void deleteGraphic(graphic)}
                          disabled={!canManageLocationGraphics}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Switch
                          checked={assignments.applyToAll}
                          onChange={(value) =>
                            void updateGraphic(graphic.id, {
                              applyToAll: value,
                              tvIds: value ? [] : assignments.tvIds,
                            })
                          }
                        />
                        <Text className="text-xs text-white/60">All TVs</Text>
                      </div>

                      {!tvs.length ? (
                        <Text className="text-xs text-white/50">
                          Add a TV to assign this graphic.
                        </Text>
                      ) : (
                        <div
                          className={clsx("grid gap-2 sm:grid-cols-2", {
                            "opacity-50": assignments.applyToAll,
                          })}
                        >
                          {tvs.map((tv) => {
                            const isChecked = assignments.tvIds.includes(tv.id);
                            return (
                              <CheckboxField key={tv.id}>
                                <Checkbox
                                  checked={isChecked}
                                  disabled={
                                    assignments.applyToAll ||
                                    !canManageLocationGraphics
                                  }
                                  onChange={(value) => {
                                    if (assignments.applyToAll) {
                                      return;
                                    }
                                    const nextIds = value
                                      ? [...assignments.tvIds, tv.id]
                                      : assignments.tvIds.filter(
                                          (tvId) => tvId !== tv.id,
                                        );
                                    void updateGraphic(graphic.id, {
                                      tvIds: nextIds,
                                    });
                                  }}
                                />
                                <Label>{tv.name}</Label>
                              </CheckboxField>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-lg font-semibold text-white">
              Business Graphics
            </Text>
            <Text className="text-sm text-white/60">
              {allowBusinessGraphics
                ? "Manage the shared graphics bank. Locations choose whether to show each item."
                : "Choose which TVs at this location show each shared graphic."}
            </Text>
          </div>
          {allowBusinessGraphics ? (
            <div className="flex items-center gap-3">
              <Input
                type="file"
                multiple
                onChange={handleBusinessUpload}
                disabled={businessUploading || !resolvedBusinessId}
              />
            </div>
          ) : null}
        </div>

        {!resolvedBusinessId ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
            <Text className="text-sm text-white/70">
              Add a Business ID above to enable shared graphics.
            </Text>
          </div>
        ) : businessGraphicsLoading ? (
          <Text className="text-sm text-white/60">
            Loading business graphics…
          </Text>
        ) : businessGraphics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
            <Text className="text-sm text-white/70">
              No shared graphics yet. Upload images to share them across
              locations.
            </Text>
          </div>
        ) : (
          <div className="space-y-4">
            {businessGraphics.map((graphic) => {
              const isHidden = Boolean(graphic.hidden);

              return (
                <div
                  key={graphic.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-40 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {graphic.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={graphic.url}
                            alt={graphic.name || "Business sign TV graphic"}
                            className="h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Text className="text-sm text-white">
                          {graphic.name || "Untitled graphic"}
                        </Text>
                        <Badge color={isHidden ? "zinc" : "emerald"}>
                          {isHidden ? "Hidden" : "Visible"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {allowBusinessGraphics ? (
                        <>
                          <Switch
                            checked={!isHidden}
                            onChange={(value) =>
                              void updateBusinessGraphic(graphic.id, {
                                hidden: !value,
                              })
                            }
                          />
                          <Text className="text-xs text-white/60">
                            {isHidden ? "Hidden" : "Visible"}
                          </Text>
                          <Button
                            outline
                            onClick={() => void deleteBusinessGraphic(graphic)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Badge color={isHidden ? "zinc" : "emerald"}>
                          {isHidden ? "Hidden" : "Visible"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {allowBusinessGraphics ? (
                      <Text className="text-xs text-white/60">
                        Assignments are managed per TV on each location.
                      </Text>
                    ) : (
                      (() => {
                        const assignedTvIds = resolveBusinessTvAssignments(
                          graphic,
                          locationId,
                          tvs,
                        );
                        const isAllAssigned =
                          tvs.length > 0 && assignedTvIds.length === tvs.length;
                        const canAssign = Boolean(locationId) && canAssignBusinessGraphics;

                        return (
                          <div className="space-y-3">
                            {!tvs.length ? (
                              <Text className="text-xs text-white/50">
                                Add a TV to assign this graphic.
                              </Text>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-3">
                                  <Switch
                                    checked={isAllAssigned}
                                    disabled={!canAssign}
                                    onChange={(value) => {
                                      if (!canAssign) {
                                        return;
                                      }
                                      const nextIds = value
                                        ? tvs.map((tv) => tv.id).filter(Boolean)
                                        : [];
                                      void updateBusinessAssignments(
                                        graphic.id,
                                        nextIds,
                                      );
                                    }}
                                  />
                                  <Text className="text-xs text-white/60">
                                    All TVs
                                  </Text>
                                </div>
                                <div
                                  className={clsx("grid gap-2 sm:grid-cols-2", {
                                    "opacity-50": !canAssign,
                                  })}
                                >
                                  {tvs.map((tv) => {
                                    const isChecked = assignedTvIds.includes(tv.id);
                                    return (
                                      <CheckboxField key={tv.id}>
                                        <Checkbox
                                          checked={isChecked}
                                          disabled={!canAssign}
                                          onChange={(value) => {
                                            if (!canAssign) {
                                              return;
                                            }
                                            const nextIds = value
                                              ? Array.from(
                                                  new Set([
                                                    ...assignedTvIds,
                                                    tv.id,
                                                  ]),
                                                )
                                              : assignedTvIds.filter(
                                                  (id) => id !== tv.id,
                                                );
                                            void updateBusinessAssignments(
                                              graphic.id,
                                              nextIds,
                                            );
                                          }}
                                        />
                                        <Label>{tv.name}</Label>
                                      </CheckboxField>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )}
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
