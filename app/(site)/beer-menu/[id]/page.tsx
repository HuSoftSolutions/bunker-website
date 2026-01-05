"use client";

import { useEffect, useMemo, useState } from "react";
import { getDoc, type DocumentData } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useFirebase } from "@/providers/FirebaseProvider";

type BeerListItem = {
  name: string;
  abv?: number | string | null;
  price?: number | string | null;
  category?: string | null;
  priority?: number | string | null;
};

type BeerDoc = {
  show?: boolean;
  locationName?: string;
  beerList?: BeerListItem[];
};

type CannedBeerDoc = {
  show?: boolean;
  locationName?: string;
  cannedBeerList?: BeerListItem[];
};

type SpecialsItem = {
  name: string;
  description?: string | null;
  price?: number | string | null;
};

type SpecialsDoc = {
  show?: boolean;
  locationName?: string;
  specialsList?: SpecialsItem[];
};

type WineDoc = {
  show?: boolean;
  locationName?: string;
  wineList?: SpecialsItem[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function asStringOrNumber(value: unknown): string | number | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number") return value;
  return null;
}

function normalizeBeerItem(value: unknown): BeerListItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  if (!name) return null;
  return {
    name,
    abv: asStringOrNumber(record.abv),
    price: asStringOrNumber(record.price),
    category: asString(record.category).trim() || null,
    priority: asStringOrNumber(record.priority),
  };
}

function normalizeSpecialItem(value: unknown): SpecialsItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = asString(record.name).trim();
  if (!name) return null;
  const description = asString(record.description).trim();
  return {
    name,
    description: description || null,
    price: asStringOrNumber(record.price),
  };
}

function groupByCategory(items: BeerListItem[]) {
  const grouped = new Map<string, BeerListItem[]>();
  items.forEach((item) => {
    const category = item.category?.trim() || "Uncategorized";
    const next = grouped.get(category) ?? [];
    next.push(item);
    grouped.set(category, next);
  });
  grouped.forEach((list) => {
    list.sort((a, b) => {
      const left = asNumber(a.priority) ?? Number.POSITIVE_INFINITY;
      const right = asNumber(b.priority) ?? Number.POSITIVE_INFINITY;
      return left - right;
    });
  });

  const categories = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "Uncategorized") return -1;
    if (b === "Uncategorized") return 1;
    return a.localeCompare(b);
  });

  return { grouped, categories };
}

function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toFixed(0);
}

function formatAbv(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toFixed(1).replace(/\.0$/, "");
}

type MenuSectionProps = {
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
};

function MenuSection({ title, subtitle, children }: MenuSectionProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/30">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-white/60">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function BeerMenuPage() {
  const firebase = useFirebase();
  const params = useParams<{ id?: string | string[] }>();
  const locationId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  }, [params?.id]);

  const [beerData, setBeerData] = useState<BeerDoc | null>(null);
  const [cannedBeerData, setCannedBeerData] = useState<CannedBeerDoc | null>(null);
  const [specialsData, setSpecialsData] = useState<SpecialsDoc | null>(null);
  const [wineData, setWineData] = useState<WineDoc | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebase || !locationId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [beerSnap, cannedBeerSnap, specialsSnap, wineSnap] = await Promise.all([
          getDoc(firebase.beerRef(locationId)),
          getDoc(firebase.cannedBeerRef(locationId)),
          getDoc(firebase.specialRef(locationId)),
          getDoc(firebase.wineRef(locationId)),
        ]);

        if (!mounted) return;

        const beerRaw = (beerSnap.data() as DocumentData | undefined) ?? null;
        const cannedRaw = (cannedBeerSnap.data() as DocumentData | undefined) ?? null;
        const specialsRaw = (specialsSnap.data() as DocumentData | undefined) ?? null;
        const wineRaw = (wineSnap.data() as DocumentData | undefined) ?? null;

        setBeerData(
          beerRaw
            ? {
                show: Boolean(beerRaw.show),
                locationName: asString(beerRaw.locationName).trim() || undefined,
                beerList: Array.isArray(beerRaw.beerList)
                  ? beerRaw.beerList
                      .map(normalizeBeerItem)
                      .filter((item): item is BeerListItem => Boolean(item))
                  : [],
              }
            : null,
        );
        setCannedBeerData(
          cannedRaw
            ? {
                show: Boolean(cannedRaw.show),
                locationName: asString(cannedRaw.locationName).trim() || undefined,
                cannedBeerList: Array.isArray(cannedRaw.cannedBeerList)
                  ? cannedRaw.cannedBeerList
                      .map(normalizeBeerItem)
                      .filter((item): item is BeerListItem => Boolean(item))
                  : [],
              }
            : null,
        );
        setSpecialsData(
          specialsRaw
            ? {
                show: Boolean(specialsRaw.show),
                locationName: asString(specialsRaw.locationName).trim() || undefined,
                specialsList: Array.isArray(specialsRaw.specialsList)
                  ? specialsRaw.specialsList
                      .map(normalizeSpecialItem)
                      .filter((item): item is SpecialsItem => Boolean(item))
                  : [],
              }
            : null,
        );
        setWineData(
          wineRaw
            ? {
                show: Boolean(wineRaw.show),
                locationName: asString(wineRaw.locationName).trim() || undefined,
                wineList: Array.isArray(wineRaw.wineList)
                  ? wineRaw.wineList
                      .map(normalizeSpecialItem)
                      .filter((item): item is SpecialsItem => Boolean(item))
                  : [],
              }
            : null,
        );

        const anyFound = Boolean(beerRaw || cannedRaw || specialsRaw || wineRaw);
        if (!anyFound) {
          setError("Menu not found for this location.");
        }
      } catch (err) {
        console.error("[BeerMenuPage] failed to fetch menu data", err);
        setError("Error fetching menu data.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [firebase, locationId]);

  const locationName = useMemo(() => {
    return (
      beerData?.locationName ||
      cannedBeerData?.locationName ||
      wineData?.locationName ||
      specialsData?.locationName ||
      null
    );
  }, [beerData?.locationName, cannedBeerData?.locationName, specialsData?.locationName, wineData?.locationName]);

  const hasAnyVisible =
    (beerData?.show && (beerData.beerList?.length ?? 0) > 0) ||
    (cannedBeerData?.show && (cannedBeerData.cannedBeerList?.length ?? 0) > 0) ||
    (wineData?.show && (wineData.wineList?.length ?? 0) > 0) ||
    (specialsData?.show && (specialsData.specialsList?.length ?? 0) > 0);

  const beerGrouped = useMemo(() => {
    const list = beerData?.beerList ?? [];
    return groupByCategory(list);
  }, [beerData?.beerList]);

  const cannedGrouped = useMemo(() => {
    const list = cannedBeerData?.cannedBeerList ?? [];
    return groupByCategory(list);
  }, [cannedBeerData?.cannedBeerList]);

  return (
    <div className="flex flex-col">
      <section className="mx-auto w-full max-w-5xl px-4 py-12 text-white/80">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
            The Bunker
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[0.35em] text-white sm:text-4xl">
            Drink Menu
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            {locationName ?? (locationId ? `Location: ${locationId}` : "")}
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-6 text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-black/40 px-6 py-10 text-center text-sm text-white/60">
            Loading menu…
          </div>
        ) : !hasAnyVisible ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center text-white/60">
            No menu items are currently available for this location.
          </div>
        ) : (
          <div className="space-y-8">
            {beerData?.show && (beerData.beerList?.length ?? 0) > 0 ? (
              <MenuSection title="Beer List" subtitle={beerData.locationName ?? null}>
                <div className="space-y-8">
                  {beerGrouped.categories.map((category) => {
                    const items = beerGrouped.grouped.get(category) ?? [];
                    if (!items.length) return null;
                    return (
                      <div key={category}>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                          {category}
                        </p>
                        <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/30">
                          {items.map((beer) => (
                            <li
                              key={`${category}-${beer.name}`}
                              className="flex items-start justify-between gap-4 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-white">
                                  {beer.name}
                                </p>
                                {beer.abv !== null && beer.abv !== undefined ? (
                                  <p className="mt-1 text-xs text-white/60">
                                    {formatAbv(beer.abv)}% ABV
                                  </p>
                                ) : null}
                              </div>
                              {beer.price !== null && beer.price !== undefined ? (
                                <p className="text-sm font-semibold text-white">
                                  ${formatMoney(beer.price)}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </MenuSection>
            ) : null}

            {cannedBeerData?.show && (cannedBeerData.cannedBeerList?.length ?? 0) > 0 ? (
              <MenuSection title="Canned Beer List" subtitle={cannedBeerData.locationName ?? null}>
                <div className="space-y-8">
                  {cannedGrouped.categories.map((category) => {
                    const items = cannedGrouped.grouped.get(category) ?? [];
                    if (!items.length) return null;
                    return (
                      <div key={category}>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                          {category}
                        </p>
                        <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/30">
                          {items.map((beer) => (
                            <li
                              key={`${category}-${beer.name}`}
                              className="flex items-start justify-between gap-4 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-white">
                                  {beer.name}
                                </p>
                                {beer.abv !== null && beer.abv !== undefined ? (
                                  <p className="mt-1 text-xs text-white/60">
                                    {formatAbv(beer.abv)}% ABV
                                  </p>
                                ) : null}
                              </div>
                              {beer.price !== null && beer.price !== undefined ? (
                                <p className="text-sm font-semibold text-white">
                                  ${formatMoney(beer.price)}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </MenuSection>
            ) : null}

            {wineData?.show && (wineData.wineList?.length ?? 0) > 0 ? (
              <MenuSection title="Wine List" subtitle={wineData.locationName ?? null}>
                <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/30">
                  {wineData.wineList!.map((wine) => (
                    <li
                      key={wine.name}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-white">
                          {wine.name}
                        </p>
                        {wine.description ? (
                          <p className="mt-1 text-xs text-white/60">
                            {wine.description}
                          </p>
                        ) : null}
                      </div>
                      {wine.price !== null && wine.price !== undefined ? (
                        <p className="text-sm font-semibold text-white">
                          ${formatMoney(wine.price)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </MenuSection>
            ) : null}

            {specialsData?.show && (specialsData.specialsList?.length ?? 0) > 0 ? (
              <MenuSection title="NFL Specials" subtitle={specialsData.locationName ?? null}>
                <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/30">
                  {specialsData.specialsList!.map((special) => (
                    <li
                      key={special.name}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-white">
                          {special.name}
                        </p>
                        {special.description ? (
                          <p className="mt-1 text-xs text-white/60">
                            {special.description}
                          </p>
                        ) : null}
                      </div>
                      {special.price !== null && special.price !== undefined ? (
                        <p className="text-sm font-semibold text-white">
                          ${formatMoney(special.price)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </MenuSection>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
