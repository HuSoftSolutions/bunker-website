"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { getDoc, setDoc, type DocumentData } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import { ErrorBox, Field, FormCard, InlineHelp, TextInput, Textarea } from "@/components/ui/Form";

type DraftBeerItem = {
  id: string;
  name: string;
  abv: string;
  price: string;
  category: string;
  priority: string;
};

type WineItem = {
  id: string;
  name: string;
  description: string;
  price: string;
};

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown) {
  return Boolean(value);
}

function normalizeDraftBeerItem(value: unknown): Omit<DraftBeerItem, "id"> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  if (!name) return null;
  return {
    name,
    abv: asString(record.abv).trim(),
    price: asString(record.price).trim(),
    category: asString(record.category).trim(),
    priority: asString(record.priority).trim(),
  };
}

function normalizeWineItem(value: unknown): Omit<WineItem, "id"> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  if (!name) return null;
  return {
    name,
    description: asString(record.description).trim(),
    price: asString(record.price).trim(),
  };
}

type BeverageMenusTabProps = {
  firebase: Firebase;
  locationId: string;
  defaultLocationName: string;
};

export function BeverageMenusTab({
  firebase,
  locationId,
  defaultLocationName,
}: BeverageMenusTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  const [locationName, setLocationName] = useState("");
  const [showBeer, setShowBeer] = useState(true);
  const [showCannedBeer, setShowCannedBeer] = useState(true);
  const [showWine, setShowWine] = useState(true);
  const [showSpecials, setShowSpecials] = useState(true);

  const [beerList, setBeerList] = useState<DraftBeerItem[]>([]);
  const [cannedBeerList, setCannedBeerList] = useState<DraftBeerItem[]>([]);
  const [wineList, setWineList] = useState<WineItem[]>([]);
  const [specialsList, setSpecialsList] = useState<WineItem[]>([]);

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (copyStatus === "copied" || copyStatus === "error") {
      const timeout = window.setTimeout(() => setCopyStatus("idle"), 2000);
      return () => window.clearTimeout(timeout);
    }
    return;
  }, [copyStatus]);

  const previewUrl = useMemo(() => {
    if (typeof window === "undefined" || !locationId) return "";
    const origin = window.location?.origin ? window.location.origin.replace(/\/$/, "") : "";
    return origin ? `${origin}/beer-menu/${locationId}` : "";
  }, [locationId]);

  useEffect(() => {
    if (!firebase || !locationId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setStatus("idle");

    void (async () => {
      try {
        const [beerSnap, cannedSnap, wineSnap, specialsSnap] = await Promise.all([
          getDoc(firebase.beerRef(locationId)),
          getDoc(firebase.cannedBeerRef(locationId)),
          getDoc(firebase.wineRef(locationId)),
          getDoc(firebase.specialRef(locationId)),
        ]);

        if (!mounted) return;

        const beerDoc = (beerSnap.data() as DocumentData | undefined) ?? {};
        const cannedDoc = (cannedSnap.data() as DocumentData | undefined) ?? {};
        const wineDoc = (wineSnap.data() as DocumentData | undefined) ?? {};
        const specialsDoc = (specialsSnap.data() as DocumentData | undefined) ?? {};

        const resolvedLocationName =
          asString(beerDoc.locationName).trim() ||
          asString(cannedDoc.locationName).trim() ||
          asString(wineDoc.locationName).trim() ||
          asString(specialsDoc.locationName).trim() ||
          defaultLocationName ||
          "";

        setLocationName(resolvedLocationName);
        setShowBeer(asBoolean(beerDoc.show ?? true));
        setShowCannedBeer(asBoolean(cannedDoc.show ?? true));
        setShowWine(asBoolean(wineDoc.show ?? true));
        setShowSpecials(asBoolean(specialsDoc.show ?? true));

        setBeerList(
          Array.isArray(beerDoc.beerList)
            ? beerDoc.beerList
                .map(normalizeDraftBeerItem)
                .filter((item): item is Omit<DraftBeerItem, "id"> => Boolean(item))
                .map((item) => ({ id: createId("beer"), ...item }))
            : [],
        );

        setCannedBeerList(
          Array.isArray(cannedDoc.cannedBeerList)
            ? cannedDoc.cannedBeerList
                .map(normalizeDraftBeerItem)
                .filter((item): item is Omit<DraftBeerItem, "id"> => Boolean(item))
                .map((item) => ({ id: createId("canned"), ...item }))
            : [],
        );

        setWineList(
          Array.isArray(wineDoc.wineList)
            ? wineDoc.wineList
                .map(normalizeWineItem)
                .filter((item): item is Omit<WineItem, "id"> => Boolean(item))
                .map((item) => ({ id: createId("wine"), ...item }))
            : [],
        );

        setSpecialsList(
          Array.isArray(specialsDoc.specialsList)
            ? specialsDoc.specialsList
                .map(normalizeWineItem)
                .filter((item): item is Omit<WineItem, "id"> => Boolean(item))
                .map((item) => ({ id: createId("special"), ...item }))
            : [],
        );
      } catch (err: unknown) {
        console.error("[BeverageMenusTab] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [firebase, locationId, defaultLocationName]);

  const counts = useMemo(
    () => ({
      draft: beerList.length,
      canned: cannedBeerList.length,
      wine: wineList.length,
      specials: specialsList.length,
    }),
    [beerList.length, cannedBeerList.length, specialsList.length, wineList.length],
  );

  const handleCopyUrl = async () => {
    if (!previewUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(previewUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = previewUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("copied");
    } catch (err) {
      console.error("[BeverageMenusTab] copy failed", err);
      setCopyStatus("error");
    }
  };

  const handleSave = async () => {
    if (!locationId) return;
    setSaving(true);
    setError(null);
    setStatus("idle");

    try {
      const normalizedName = locationName.trim() || defaultLocationName || "";

      await Promise.all([
        setDoc(
          firebase.beerRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showBeer),
            beerList: beerList.map(({ id: _id, ...rest }) => ({
              ...rest,
              name: rest.name.trim(),
            })),
          },
          { merge: true },
        ),
        setDoc(
          firebase.cannedBeerRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showCannedBeer),
            cannedBeerList: cannedBeerList.map(({ id: _id, ...rest }) => ({
              ...rest,
              name: rest.name.trim(),
            })),
          },
          { merge: true },
        ),
        setDoc(
          firebase.wineRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showWine),
            wineList: wineList.map(({ id: _id, ...rest }) => ({
              ...rest,
              name: rest.name.trim(),
            })),
          },
          { merge: true },
        ),
        setDoc(
          firebase.specialRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showSpecials),
            specialsList: specialsList.map(({ id: _id, ...rest }) => ({
              ...rest,
              name: rest.name.trim(),
            })),
          },
          { merge: true },
        ),
      ]);

      setStatus("success");
    } catch (err: unknown) {
      console.error("[BeverageMenusTab] save failed", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
            Beverage Menus
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Manage the public QR drink menu for this location (draft beer, canned beer, wine, and specials).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {saving ? "Saving…" : "Save Beverage Menus"}
          </button>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Open Public Menu
            </a>
          ) : null}
        </div>
      </div>

      {status === "success" ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
          Saved.
        </div>
      ) : null}
      {status === "error" && error ? <ErrorBox>{error.message}</ErrorBox> : null}

      <FormCard>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Location Name">
            <TextInput
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              disabled={loading || saving}
              placeholder={defaultLocationName || "The Bunker"}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Public QR URL">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <TextInput readOnly value={previewUrl || ""} />
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  disabled={!previewUrl}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
                >
                  Copy
                </button>
              </div>
              {copyStatus !== "idle" ? (
                <InlineHelp className={clsx(copyStatus === "error" ? "text-red-200" : "text-emerald-200")}>
                  {copyStatus === "copied" ? "Copied!" : "Copy failed"}
                </InlineHelp>
              ) : null}
            </Field>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Draft Beers",
                count: counts.draft,
                visible: showBeer,
                onToggle: () => setShowBeer((prev) => !prev),
              },
              {
                label: "Canned Beers",
                count: counts.canned,
                visible: showCannedBeer,
                onToggle: () => setShowCannedBeer((prev) => !prev),
              },
              {
                label: "Wines",
                count: counts.wine,
                visible: showWine,
                onToggle: () => setShowWine((prev) => !prev),
              },
              {
                label: "Specials",
                count: counts.specials,
                visible: showSpecials,
                onToggle: () => setShowSpecials((prev) => !prev),
              },
            ] as const
          ).map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                {card.label}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-2xl font-bold text-white">{card.count}</p>
                <button
                  type="button"
                  onClick={card.onToggle}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide transition",
                    card.visible
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {card.visible ? "Visible" : "Hidden"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Draft Beer
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Name, ABV, price, category, and priority order.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setBeerList((prev) => [
                ...prev,
                { id: createId("beer"), name: "", abv: "", price: "", category: "", priority: "" },
              ])
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Draft Beer
          </button>
        </div>

        {beerList.length ? (
          <div className="mt-6 space-y-4">
            {beerList.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Draft Beer
                  </p>
                  <button
                    type="button"
                    onClick={() => setBeerList((prev) => prev.filter((row) => row.id !== item.id))}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-5">
                  <Field label="Name" required className="md:col-span-2">
                    <TextInput
                      value={item.name}
                      onChange={(e) =>
                        setBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label="ABV">
                    <TextInput
                      value={item.abv}
                      onChange={(e) =>
                        setBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, abv: e.target.value } : row)),
                        )
                      }
                      placeholder="6.5"
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={item.price}
                      onChange={(e) =>
                        setBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, price: e.target.value } : row)),
                        )
                      }
                      placeholder="8"
                    />
                  </Field>
                  <Field label="Priority">
                    <TextInput
                      value={item.priority}
                      onChange={(e) =>
                        setBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, priority: e.target.value } : row)),
                        )
                      }
                      placeholder="1"
                    />
                  </Field>
                  <Field label="Category" className="md:col-span-5">
                    <TextInput
                      value={item.category}
                      onChange={(e) =>
                        setBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, category: e.target.value } : row)),
                        )
                      }
                      placeholder="IPA"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
            No draft beers listed yet.
          </p>
        )}
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Canned Beer
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Packaged options (to-go or specialty releases).
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setCannedBeerList((prev) => [
                ...prev,
                { id: createId("canned"), name: "", abv: "", price: "", category: "", priority: "" },
              ])
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Canned Beer
          </button>
        </div>

        {cannedBeerList.length ? (
          <div className="mt-6 space-y-4">
            {cannedBeerList.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Canned Beer
                  </p>
                  <button
                    type="button"
                    onClick={() => setCannedBeerList((prev) => prev.filter((row) => row.id !== item.id))}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-5">
                  <Field label="Name" required className="md:col-span-2">
                    <TextInput
                      value={item.name}
                      onChange={(e) =>
                        setCannedBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label="ABV">
                    <TextInput
                      value={item.abv}
                      onChange={(e) =>
                        setCannedBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, abv: e.target.value } : row)),
                        )
                      }
                      placeholder="6.5"
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={item.price}
                      onChange={(e) =>
                        setCannedBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, price: e.target.value } : row)),
                        )
                      }
                      placeholder="8"
                    />
                  </Field>
                  <Field label="Priority">
                    <TextInput
                      value={item.priority}
                      onChange={(e) =>
                        setCannedBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, priority: e.target.value } : row)),
                        )
                      }
                      placeholder="1"
                    />
                  </Field>
                  <Field label="Category" className="md:col-span-5">
                    <TextInput
                      value={item.category}
                      onChange={(e) =>
                        setCannedBeerList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, category: e.target.value } : row)),
                        )
                      }
                      placeholder="IPA"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
            No canned beers listed yet.
          </p>
        )}
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Wine List
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Glass pours and bottle options.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setWineList((prev) => [
                ...prev,
                { id: createId("wine"), name: "", description: "", price: "" },
              ])
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Wine
          </button>
        </div>

        {wineList.length ? (
          <div className="mt-6 space-y-4">
            {wineList.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Wine
                  </p>
                  <button
                    type="button"
                    onClick={() => setWineList((prev) => prev.filter((row) => row.id !== item.id))}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Name" required>
                    <TextInput
                      value={item.name}
                      onChange={(e) =>
                        setWineList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={item.price}
                      onChange={(e) =>
                        setWineList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, price: e.target.value } : row)),
                        )
                      }
                      placeholder="10"
                    />
                  </Field>
                  <Field label="Description" className="md:col-span-3">
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) =>
                        setWineList((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, description: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Optional description"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
            No wine entries configured.
          </p>
        )}
      </FormCard>

      <FormCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Specials
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Featured cocktails or seasonal drink specials.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSpecialsList((prev) => [
                ...prev,
                { id: createId("special"), name: "", description: "", price: "" },
              ])
            }
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          >
            Add Special
          </button>
        </div>

        {specialsList.length ? (
          <div className="mt-6 space-y-4">
            {specialsList.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    Special
                  </p>
                  <button
                    type="button"
                    onClick={() => setSpecialsList((prev) => prev.filter((row) => row.id !== item.id))}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Name" required>
                    <TextInput
                      value={item.name}
                      onChange={(e) =>
                        setSpecialsList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label="Price">
                    <TextInput
                      value={item.price}
                      onChange={(e) =>
                        setSpecialsList((prev) =>
                          prev.map((row) => (row.id === item.id ? { ...row, price: e.target.value } : row)),
                        )
                      }
                      placeholder="12"
                    />
                  </Field>
                  <Field label="Description" className="md:col-span-3">
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) =>
                        setSpecialsList((prev) =>
                          prev.map((row) =>
                            row.id === item.id ? { ...row, description: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="Optional description"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
            No specials configured.
          </p>
        )}
      </FormCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
        >
          {saving ? "Saving…" : "Save Beverage Menus"}
        </button>
      </div>
    </div>
  );
}
