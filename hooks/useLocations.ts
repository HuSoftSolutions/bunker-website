import { useEffect, useMemo, useState } from "react";
import Firebase from "@/lib/firebase/client";
import {
  FALLBACK_LOCATION_MAP,
  FALLBACK_LOCATIONS,
  LocationRecord,
} from "@/data/locationConfig";
import { onSnapshot, type DocumentData, type QuerySnapshot } from "firebase/firestore";

type MenuRecord = {
  name?: string;
  pdf?: unknown;
  storagePath?: string | null;
  downloadUrl?: unknown;
  url?: unknown;
  [key: string]: unknown;
};

const resolveMenuRecord = (value: unknown): MenuRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as MenuRecord;
};

const resolveMenuArray = (value: unknown): MenuRecord[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(
    (menu): menu is MenuRecord => Boolean(menu) && typeof menu === "object",
  );
};

const menuPdfFallback = (menu: MenuRecord = {}) =>
  menu.pdf || menu.downloadUrl || menu.url || null;

const normalizeLegacyMenu = (
  menu: MenuRecord | null | undefined,
  defaultName = "Brunch Menu",
) => {
  if (!menu) {
    return null;
  }

  const pdf = menuPdfFallback(menu);
  const name =
    typeof menu.name === "string" && menu.name.trim()
      ? menu.name.trim()
      : defaultName;
  const storagePath =
    typeof menu.storagePath === "string" && menu.storagePath.trim()
      ? menu.storagePath.trim()
      : null;

  if (!name && !pdf) {
    return null;
  }

  const entry: Record<string, unknown> = {};
  if (name) {
    entry.name = name;
  }
  if (pdf) {
    entry.pdf = pdf;
  }
  if (storagePath) {
    entry.storagePath = storagePath;
  }

  return entry;
};

const mergeMenus = (
  fallbackMenus: MenuRecord[] = [],
  remoteMenus?: MenuRecord[] | null,
) => {
  if (remoteMenus === undefined) {
    return fallbackMenus;
  }

  if (!Array.isArray(remoteMenus)) {
    return fallbackMenus;
  }

  const fallbackByName = new Map(
    fallbackMenus
      .filter((menu) => menu?.name)
      .map((menu) => [menu.name, menu]),
  );

  const merged = fallbackMenus.map((fallbackMenu) => {
    const remoteMenu = remoteMenus.find(
      (menu) => menu?.name && menu.name === fallbackMenu.name,
    );

    if (!remoteMenu) {
      return fallbackMenu;
    }

    return {
      ...fallbackMenu,
      ...remoteMenu,
      pdf: menuPdfFallback(remoteMenu) || fallbackMenu.pdf,
    };
  });

  remoteMenus.forEach((remoteMenu) => {
    if (!remoteMenu) {
      return;
    }

    if (!remoteMenu.name || !fallbackByName.has(remoteMenu.name)) {
      merged.push({
        ...remoteMenu,
        pdf: menuPdfFallback(remoteMenu),
      });
    }
  });

  return merged.filter((menu) => menu && menu.name);
};

const resolveRecordValue = (
  value: unknown,
): Record<string, unknown> | null | undefined => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const mergeRates = (fallbackRates: unknown, remoteRates: unknown) => {
  if (remoteRates === undefined) {
    return resolveRecordValue(fallbackRates);
  }

  if (remoteRates === null) {
    return null;
  }

  const fallbackResolved = resolveRecordValue(fallbackRates);
  const remoteResolved = resolveRecordValue(remoteRates);

  if (!fallbackResolved) {
    return remoteResolved;
  }

  if (!remoteResolved) {
    return fallbackResolved;
  }

  return {
    ...fallbackResolved,
    ...remoteResolved,
    bays: remoteResolved.bays ?? fallbackResolved.bays,
  };
};

export const mergeLocationRecord = (
  fallbackLocation: LocationRecord = {},
  remoteLocation: LocationRecord = {},
) => {
  const merged: LocationRecord = {
    ...fallbackLocation,
    ...remoteLocation,
  };

  const remoteImages = remoteLocation.images;
  const fallbackImages = fallbackLocation.images;

  merged.images =
    Array.isArray(remoteImages) && remoteImages.length
      ? remoteImages
      : Array.isArray(fallbackImages)
      ? fallbackImages
      : Array.isArray(remoteImages)
      ? remoteImages
      : [];

  merged.nonPeakRates = mergeRates(
    fallbackLocation.nonPeakRates,
    remoteLocation.nonPeakRates,
  );

  merged.peakRates = mergeRates(
    fallbackLocation.peakRates,
    remoteLocation.peakRates,
  );

  merged.promotions =
    remoteLocation.promotions ?? fallbackLocation.promotions ?? [];

  merged.careerEmails =
    remoteLocation.careerEmails ?? fallbackLocation.careerEmails;

  const fallbackMenus = resolveMenuArray(fallbackLocation.menus) ?? [];
  const remoteMenus = resolveMenuArray(remoteLocation.menus);
  const mergedMenus = mergeMenus(fallbackMenus, remoteMenus);
  merged.menus = mergedMenus;

  const legacyMenus = [
    normalizeLegacyMenu(resolveMenuRecord(fallbackLocation.brunchMenu)),
    normalizeLegacyMenu(resolveMenuRecord(remoteLocation.brunchMenu)),
  ].filter(Boolean) as MenuRecord[];

  if (legacyMenus.length) {
    const existingByName = new Map<string, MenuRecord>(
      mergedMenus
        .filter(
          (menu: MenuRecord): menu is MenuRecord & { name: string } =>
            Boolean(menu?.name),
        )
        .map((menu: MenuRecord & { name: string }) => [
          menu.name.toLowerCase(),
          menu,
        ]),
    );

    legacyMenus.forEach((legacyMenu) => {
      const key = (legacyMenu.name || "").toLowerCase();
      const existing = existingByName.get(key);
      if (existing) {
        existing.pdf = existing.pdf || legacyMenu.pdf;
        existing.storagePath =
          existing.storagePath || legacyMenu.storagePath;
      } else {
        mergedMenus.push(legacyMenu);
        existingByName.set(key, legacyMenu);
      }
    });
  }

  delete merged.brunchMenu;

  const fallbackCoordinates = resolveRecordValue(fallbackLocation.coordinates);
  const remoteCoordinates = resolveRecordValue(remoteLocation.coordinates);
  merged.coordinates = remoteCoordinates
    ? {
        ...(fallbackCoordinates ?? {}),
        ...remoteCoordinates,
      }
    : fallbackCoordinates;

  merged.amenities = fallbackLocation.amenities;

  merged.notice =
    remoteLocation.notice ?? fallbackLocation.notice ?? null;

  merged.hoursFull =
    remoteLocation.hoursFull ?? fallbackLocation.hoursFull ?? "";

  merged.doordash =
    remoteLocation.doordash ?? fallbackLocation.doordash;

  merged.ubereats =
    remoteLocation.ubereats ?? fallbackLocation.ubereats;

  merged.mealeo = remoteLocation.mealeo ?? fallbackLocation.mealeo;

  merged.email = remoteLocation.email ?? fallbackLocation.email;
  merged.phone = remoteLocation.phone ?? fallbackLocation.phone;
  merged.address =
    remoteLocation.address ?? fallbackLocation.address;

  merged.url = remoteLocation.url ?? fallbackLocation.url;

  merged.newItems =
    remoteLocation.newItems ?? fallbackLocation.newItems;

  merged.name =
    typeof remoteLocation.name === "string" && remoteLocation.name.trim()
      ? remoteLocation.name
      : fallbackLocation.name;

  merged.about =
    typeof remoteLocation.about === "string" && remoteLocation.about.trim()
      ? remoteLocation.about
      : fallbackLocation.about;

  merged.id = remoteLocation.id ?? fallbackLocation.id;

  return merged;
};

export const buildLocationList = (
  remoteLocations: LocationRecord[] | null,
) => {
  if (!Array.isArray(remoteLocations) || remoteLocations.length === 0) {
    return FALLBACK_LOCATIONS;
  }

  const seen = new Set<string>();
  const mergedLocations = remoteLocations.map((remote) => {
    const remoteId = typeof remote.id === "string" ? remote.id : "";
    const fallback = remoteId ? FALLBACK_LOCATION_MAP[remoteId] || {} : {};
    if (remoteId) {
      seen.add(remoteId);
    }
    return mergeLocationRecord(fallback, remote);
  });

  FALLBACK_LOCATIONS.forEach((fallbackLocation) => {
    const fallbackId =
      typeof fallbackLocation.id === "string" ? fallbackLocation.id : "";
    if (!fallbackId || !seen.has(fallbackId)) {
      mergedLocations.push(fallbackLocation);
    }
  });

  return mergedLocations;
};

const useLocations = (firebase: Firebase) => {
  const [locations, setLocations] = useState<LocationRecord[]>(
    FALLBACK_LOCATIONS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [remoteData, setRemoteData] = useState<LocationRecord[] | null>(null);

  useEffect(() => {
    if (!firebase) {
      setLoading(false);
      return undefined;
    }

    const ref = firebase.locationsRef();
    const unsubscribe = onSnapshot(
      ref,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const remote = snapshot.docs.map<LocationRecord>((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRemoteData(remote);
        setLocations(buildLocationList(remote));
        setLoading(false);
      },
      (err: unknown) => {
        console.error("[useLocations] failed to load", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setRemoteData(null);
        setLocations(FALLBACK_LOCATIONS);
        setLoading(false);
      },
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebase]);

  return useMemo(
    () => ({
      locations,
      loading,
      error,
      fallback: FALLBACK_LOCATIONS,
      remote: remoteData,
    }),
    [locations, loading, error, remoteData],
  );
};

export default useLocations;
