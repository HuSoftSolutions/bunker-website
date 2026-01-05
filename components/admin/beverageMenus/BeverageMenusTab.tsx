"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { getDoc, setDoc, type DocumentData } from "firebase/firestore";
import { toast } from "react-toastify";
import type Firebase from "@/lib/firebase/client";
import { Button } from "@/ui-kit/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
import { Description, Field, Label } from "@/ui-kit/fieldset";
import { Divider } from "@/ui-kit/divider";
import { Input } from "@/ui-kit/input";
import { Subheading } from "@/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui-kit/table";
import { Text } from "@/ui-kit/text";
import { Textarea } from "@/ui-kit/textarea";
import { Switch, SwitchField, SwitchGroup } from "@/ui-kit/switch";

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

type BeverageSection = "draft" | "canned" | "wine" | "specials";

type BeverageMenusTabProps = {
  firebase: Firebase;
  locationId: string;
  defaultLocationName: string;
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

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Field>
      <Label>{label}</Label>
      {children}
      {hint ? <Description>{hint}</Description> : null}
    </Field>
  );
}

export function BeverageMenusTab({
  firebase,
  locationId,
  defaultLocationName,
}: BeverageMenusTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [locationName, setLocationName] = useState("");
  const [showBeer, setShowBeer] = useState(true);
  const [showCannedBeer, setShowCannedBeer] = useState(true);
  const [showWine, setShowWine] = useState(true);
  const [showSpecials, setShowSpecials] = useState(true);

  const [beerList, setBeerList] = useState<DraftBeerItem[]>([]);
  const [cannedBeerList, setCannedBeerList] = useState<DraftBeerItem[]>([]);
  const [wineList, setWineList] = useState<WineItem[]>([]);
  const [specialsList, setSpecialsList] = useState<WineItem[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSection, setModalSection] = useState<BeverageSection | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [beerDraft, setBeerDraft] = useState<DraftBeerItem>({
    id: createId("beer"),
    name: "",
    abv: "",
    price: "",
    category: "",
    priority: "",
  });
  const [wineDraft, setWineDraft] = useState<WineItem>({
    id: createId("wine"),
    name: "",
    description: "",
    price: "",
  });

  const previewUrl = useMemo(() => {
    if (typeof window === "undefined" || !locationId) return "";
    const origin = window.location?.origin ? window.location.origin.replace(/\/$/, "") : "";
    return origin ? `${origin}/beer-menu/${locationId}` : "";
  }, [locationId]);

  useEffect(() => {
    if (!firebase || !locationId) return;

    let mounted = true;
    setLoading(true);

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
        toast.error("Failed to load beverage menus.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [firebase, locationId, defaultLocationName]);

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
      toast.success("Public menu link copied.");
    } catch (err) {
      console.error("[BeverageMenusTab] copy failed", err);
      toast.error("Failed to copy the public menu link.");
    }
  };

  const handleSave = async () => {
    if (!locationId) return;
    setSaving(true);

    try {
      const normalizedName = locationName.trim() || defaultLocationName || "";

      await Promise.all([
        setDoc(
          firebase.beerRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showBeer),
            beerList: beerList.map((item) => {
              const { id: removed, ...rest } = item;
              void removed;
              return {
                ...rest,
                name: rest.name.trim(),
              };
            }),
          },
          { merge: true },
        ),
        setDoc(
          firebase.cannedBeerRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showCannedBeer),
            cannedBeerList: cannedBeerList.map((item) => {
              const { id: removed, ...rest } = item;
              void removed;
              return {
                ...rest,
                name: rest.name.trim(),
              };
            }),
          },
          { merge: true },
        ),
        setDoc(
          firebase.wineRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showWine),
            wineList: wineList.map((item) => {
              const { id: removed, ...rest } = item;
              void removed;
              return {
                ...rest,
                name: rest.name.trim(),
              };
            }),
          },
          { merge: true },
        ),
        setDoc(
          firebase.specialRef(locationId),
          {
            locationName: normalizedName,
            show: Boolean(showSpecials),
            specialsList: specialsList.map((item) => {
              const { id: removed, ...rest } = item;
              void removed;
              return {
                ...rest,
                name: rest.name.trim(),
              };
            }),
          },
          { merge: true },
        ),
      ]);

      toast.success("Beverage menus saved.");
    } catch (err: unknown) {
      console.error("[BeverageMenusTab] save failed", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save beverage menus.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openBeerModal = (section: "draft" | "canned", index: number | null) => {
    if (index === null) {
      setBeerDraft({
        id: createId(section),
        name: "",
        abv: "",
        price: "",
        category: "",
        priority: "",
      });
      setEditingIndex(null);
    } else {
      const list = section === "draft" ? beerList : cannedBeerList;
      const item = list[index];
      if (!item) return;
      setBeerDraft(item);
      setEditingIndex(index);
    }
    setModalSection(section);
    setModalOpen(true);
  };

  const openWineModal = (section: "wine" | "specials", index: number | null) => {
    if (index === null) {
      setWineDraft({
        id: createId(section),
        name: "",
        description: "",
        price: "",
      });
      setEditingIndex(null);
    } else {
      const list = section === "wine" ? wineList : specialsList;
      const item = list[index];
      if (!item) return;
      setWineDraft(item);
      setEditingIndex(index);
    }
    setModalSection(section);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalSection(null);
    setEditingIndex(null);
  };

  const handleSaveDraft = () => {
    if (!modalSection) return;

    if (modalSection === "draft" || modalSection === "canned") {
      const list = modalSection === "draft" ? beerList : cannedBeerList;
      const next =
        editingIndex === null
          ? [...list, beerDraft]
          : list.map((item, idx) => (idx === editingIndex ? beerDraft : item));

      if (modalSection === "draft") {
        setBeerList(next);
      } else {
        setCannedBeerList(next);
      }
    } else {
      const list = modalSection === "wine" ? wineList : specialsList;
      const next =
        editingIndex === null
          ? [...list, wineDraft]
          : list.map((item, idx) => (idx === editingIndex ? wineDraft : item));

      if (modalSection === "wine") {
        setWineList(next);
      } else {
        setSpecialsList(next);
      }
    }

    closeModal();
  };

  const handleDelete = (section: BeverageSection, index: number) => {
    switch (section) {
      case "draft":
        setBeerList((prev) => prev.filter((_, idx) => idx !== index));
        break;
      case "canned":
        setCannedBeerList((prev) => prev.filter((_, idx) => idx !== index));
        break;
      case "wine":
        setWineList((prev) => prev.filter((_, idx) => idx !== index));
        break;
      case "specials":
        setSpecialsList((prev) => prev.filter((_, idx) => idx !== index));
        break;
      default:
        break;
    }
  };

  const isBeerModal = modalSection === "draft" || modalSection === "canned";
  const modalTitle = modalSection
    ? `${editingIndex === null ? "Add" : "Edit"} ${
        modalSection === "draft"
          ? "Draft Beer"
          : modalSection === "canned"
            ? "Canned Beer"
            : modalSection === "wine"
              ? "Wine"
              : "Special"
      }`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Subheading className="text-white">Beverage Menus</Subheading>
          <Text className="mt-2 text-sm text-white/60">
            Manage the public QR drink menu for this location (draft beer, canned beer, wine, and specials).
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button color="red" onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? "Saving…" : "Save Beverage Menus"}
          </Button>
          {previewUrl ? (
            <Button outline href={previewUrl} target="_blank" rel="noreferrer">
              Open Public Menu
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <FormField label="Location Name">
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              disabled={loading || saving}
              placeholder={defaultLocationName || "The Bunker"}
            />
          </FormField>
          <FormField label="Public QR URL" hint="Use this for QR signage and the public menu link.">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input readOnly value={previewUrl || ""} />
              <Button outline onClick={() => void handleCopyUrl()} disabled={!previewUrl}>
                Copy
              </Button>
            </div>
          </FormField>
        </div>

        <Divider soft className="my-6" />

        <div>
          <Text className="text-xs uppercase tracking-wide text-white/50">Public menu visibility</Text>
          <SwitchGroup className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <SwitchField className="gap-x-4">
                <Label className="text-sm text-white">Draft Beers</Label>
                <Description className="text-xs text-white/50">{beerList.length} items</Description>
                <Switch checked={showBeer} onChange={setShowBeer} />
              </SwitchField>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <SwitchField className="gap-x-4">
                <Label className="text-sm text-white">Canned Beers</Label>
                <Description className="text-xs text-white/50">{cannedBeerList.length} items</Description>
                <Switch checked={showCannedBeer} onChange={setShowCannedBeer} />
              </SwitchField>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <SwitchField className="gap-x-4">
                <Label className="text-sm text-white">Wines</Label>
                <Description className="text-xs text-white/50">{wineList.length} items</Description>
                <Switch checked={showWine} onChange={setShowWine} />
              </SwitchField>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <SwitchField className="gap-x-4">
                <Label className="text-sm text-white">Specials</Label>
                <Description className="text-xs text-white/50">{specialsList.length} items</Description>
                <Switch checked={showSpecials} onChange={setShowSpecials} />
              </SwitchField>
            </div>
          </SwitchGroup>
        </div>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Subheading className="text-white">Draft Beer</Subheading>
              <Text className="mt-2 text-sm text-white/60">
                Name, ABV, price, category, and priority order.
              </Text>
            </div>
            <Button outline onClick={() => openBeerModal("draft", null)}>
              Add Draft Beer
            </Button>
          </div>

          {beerList.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>ABV</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beerList.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-white">{item.name || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.abv || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.price || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.category || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.priority || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openBeerModal("draft", index)}>
                            Edit
                          </Button>
                          <Button color="red" onClick={() => handleDelete("draft", index)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
              <Text className="text-sm text-white/70">No draft beers listed yet.</Text>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Subheading className="text-white">Canned Beer</Subheading>
              <Text className="mt-2 text-sm text-white/60">
                Packaged options (to-go or specialty releases).
              </Text>
            </div>
            <Button outline onClick={() => openBeerModal("canned", null)}>
              Add Canned Beer
            </Button>
          </div>

          {cannedBeerList.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>ABV</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cannedBeerList.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-white">{item.name || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.abv || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.price || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.category || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.priority || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openBeerModal("canned", index)}>
                            Edit
                          </Button>
                          <Button color="red" onClick={() => handleDelete("canned", index)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
              <Text className="text-sm text-white/70">No canned beers listed yet.</Text>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Subheading className="text-white">Wine List</Subheading>
              <Text className="mt-2 text-sm text-white/60">
                Glass pours and bottle options.
              </Text>
            </div>
            <Button outline onClick={() => openWineModal("wine", null)}>
              Add Wine
            </Button>
          </div>

          {wineList.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wineList.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-white">{item.name || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.description || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.price || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openWineModal("wine", index)}>
                            Edit
                          </Button>
                          <Button color="red" onClick={() => handleDelete("wine", index)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
              <Text className="text-sm text-white/70">No wine entries configured.</Text>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Subheading className="text-white">Specials</Subheading>
              <Text className="mt-2 text-sm text-white/60">
                Featured cocktails or seasonal drink specials.
              </Text>
            </div>
            <Button outline onClick={() => openWineModal("specials", null)}>
              Add Special
            </Button>
          </div>

          {specialsList.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Table dense>
                <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader>Price</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {specialsList.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-white">{item.name || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.description || "—"}</TableCell>
                      <TableCell className="text-white/70">{item.price || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button outline onClick={() => openWineModal("specials", index)}>
                            Edit
                          </Button>
                          <Button color="red" onClick={() => handleDelete("specials", index)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
              <Text className="text-sm text-white/70">No specials configured.</Text>
            </div>
          )}
        </section>
      </div>

      <div className="flex justify-end">
        <Button color="red" onClick={() => void handleSave()} disabled={loading || saving}>
          {saving ? "Saving…" : "Save Beverage Menus"}
        </Button>
      </div>

      {modalOpen && modalSection ? (
        <Dialog open={modalOpen} onClose={closeModal}>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {isBeerModal
              ? "Update the details for this beer entry."
              : "Update the details for this wine or special."}
          </DialogDescription>
          <DialogBody>
            {isBeerModal ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name">
                  <Input
                    value={beerDraft.name}
                    onChange={(event) =>
                      setBeerDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="ABV">
                  <Input
                    value={beerDraft.abv}
                    onChange={(event) =>
                      setBeerDraft((prev) => ({ ...prev, abv: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Price">
                  <Input
                    value={beerDraft.price}
                    onChange={(event) =>
                      setBeerDraft((prev) => ({ ...prev, price: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Priority">
                  <Input
                    value={beerDraft.priority}
                    onChange={(event) =>
                      setBeerDraft((prev) => ({ ...prev, priority: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Category" hint="Example: IPA, Lager, Seasonal">
                  <Input
                    value={beerDraft.category}
                    onChange={(event) =>
                      setBeerDraft((prev) => ({ ...prev, category: event.target.value }))
                    }
                  />
                </FormField>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name">
                  <Input
                    value={wineDraft.name}
                    onChange={(event) =>
                      setWineDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Price">
                  <Input
                    value={wineDraft.price}
                    onChange={(event) =>
                      setWineDraft((prev) => ({ ...prev, price: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Description" hint="Optional">
                  <Textarea
                    rows={3}
                    value={wineDraft.description}
                    onChange={(event) =>
                      setWineDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </FormField>
              </div>
            )}
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleSaveDraft}>
              {editingIndex === null ? "Add" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}
