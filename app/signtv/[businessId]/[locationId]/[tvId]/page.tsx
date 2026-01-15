"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import type Firebase from "@/lib/firebase/client";
import { SignTvTicker } from "@/components/signTv/SignTvTicker";
import { SIGN_TV_BUSINESS_ID } from "@/constants/routes";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { useFirebase } from "@/providers/FirebaseProvider";

const THEME_CLASSES: Record<string, string> = {
  blue: "bg-slate-800 text-white",
  red: "bg-red-800 text-white",
  light: "bg-white text-black",
  dark: "bg-black text-white",
};

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
  name?: string;
  tickerText?: string;
  settings?: SignTvSettings;
};

type SignTvGraphic = {
  id: string;
  url: string;
  hidden?: boolean;
  tvIds?: string[];
  applyToAll?: boolean;
};

type BusinessSignTvGraphic = {
  id: string;
  url: string;
  hidden?: boolean;
  locationIds?: string[];
  applyToAllLocations?: boolean;
  locationTvIds?: Record<string, string[]>;
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveSignTvSettings = (value?: SignTvSettings): SignTvSettings => ({
  tvMounted: value?.tvMounted ?? "landscape",
  tvRotationDirection:
    value?.tvRotationDirection ?? "translate(-50%, -50%) rotate(-90deg)",
  tickerDisplay: value?.tickerDisplay ?? "bottom",
  tickerSize: value?.tickerSize ?? "md",
  tickerTheme: value?.tickerTheme ?? "blue",
  backgroundColor: value?.backgroundColor ?? "blue",
});

type SignTvParams = {
  businessId?: string | string[];
  locationId?: string | string[];
  tvId?: string | string[];
};

export default function SignTvPage() {
  const firebase = useFirebase() as Firebase;
  const { width, height } = useWindowDimensions();
  const [location, setLocation] = useState<Record<string, unknown> | null>(null);
  const [graphics, setGraphics] = useState<SignTvGraphic[]>([]);
  const [businessGraphics, setBusinessGraphics] = useState<BusinessSignTvGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const params = useParams<SignTvParams>();
  const businessParam =
    typeof params?.businessId === "string" ? params.businessId : "";
  const locationId =
    typeof params?.locationId === "string" ? params.locationId : "";
  const tvId = typeof params?.tvId === "string" ? params.tvId : "";
  const businessId = SIGN_TV_BUSINESS_ID;

  useEffect(() => {
    if (!locationId) {
      return undefined;
    }

    setLoading(true);
    const locationRef = doc(firebase.db, "locations", locationId);
    const unsubscribe = onSnapshot(
      locationRef,
      (snapshot) => {
        setLocation(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
      },
      () => {
        setLocation(null);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [firebase.db, locationId]);

  useEffect(() => {
    if (!locationId) {
      setGraphics([]);
      return undefined;
    }

    const graphicsRef = collection(
      firebase.db,
      "locations",
      locationId,
      "signTvGraphics",
    );

    const unsubscribe = onSnapshot(graphicsRef, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          url: resolveStringValue(data?.url),
          hidden: Boolean(data?.hidden),
          tvIds: Array.isArray(data?.tvIds) ? data.tvIds : [],
          applyToAll: Boolean(data?.applyToAll),
        } satisfies SignTvGraphic;
      });

      setGraphics(next);
    });

    return () => unsubscribe();
  }, [firebase.db, locationId]);

  useEffect(() => {
    if (!businessId || businessParam !== businessId) {
      setBusinessGraphics([]);
      return undefined;
    }

    const graphicsRef = collection(
      firebase.db,
      "signTvBusinesses",
      businessId,
      "graphics",
    );

    const unsubscribe = onSnapshot(graphicsRef, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          url: resolveStringValue(data?.url),
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
    });

    return () => unsubscribe();
  }, [businessId, businessParam, firebase.db]);

  const signTvs = useMemo(() => {
    if (!location || !Array.isArray(location.signTvs)) {
      return [];
    }

    return location.signTvs
      .filter(
        (entry): entry is SignTv =>
          Boolean(entry) && typeof entry === "object" && "id" in entry,
      )
      .map((entry) => ({
        id: resolveStringValue(entry.id),
        name: resolveStringValue(entry.name),
        tickerText: resolveStringValue(entry.tickerText),
        settings: entry.settings as SignTvSettings | undefined,
      }))
      .filter((entry) => entry.id);
  }, [location]);

  const activeTv = useMemo(
    () => signTvs.find((tv) => tv.id === tvId) ?? null,
    [signTvs, tvId],
  );

  const settings = useMemo(
    () => resolveSignTvSettings(activeTv?.settings),
    [activeTv?.settings],
  );

  const tickerText =
    resolveStringValue(activeTv?.tickerText) ||
    resolveStringValue(location?.signTvTickerText) ||
    resolveStringValue(location?.tickerText);

  const businessMatches = !location ? true : businessParam === businessId;

  const visibleGraphics = useMemo(() => {
    const locationUrls = graphics
      .filter((graphic) => {
        if (!graphic.url || graphic.hidden) {
          return false;
        }

        if (graphic.applyToAll) {
          return true;
        }

        return Array.isArray(graphic.tvIds) && graphic.tvIds.includes(tvId);
      })
      .map((graphic) => graphic.url);

    const businessUrls = businessGraphics
      .filter((graphic) => {
        if (!graphic.url || graphic.hidden) {
          return false;
        }

        const assignments =
          graphic.locationTvIds &&
          typeof graphic.locationTvIds === "object" &&
          Object.prototype.hasOwnProperty.call(graphic.locationTvIds, locationId)
            ? graphic.locationTvIds[locationId]
            : null;

        if (Array.isArray(assignments)) {
          return assignments.includes(tvId);
        }

        if (
          graphic.applyToAllLocations ||
          (Array.isArray(graphic.locationIds) &&
            graphic.locationIds.includes(locationId))
        ) {
          return signTvs.some((tv) => tv.id === tvId);
        }

        return false;
      })
      .map((graphic) => graphic.url);

    return [...locationUrls, ...businessUrls];
  }, [businessGraphics, graphics, locationId, signTvs, tvId]);

  useEffect(() => {
    if (visibleGraphics.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleGraphics.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [visibleGraphics.length]);

  useEffect(() => {
    if (currentIndex >= visibleGraphics.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleGraphics.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading sign TV…
      </div>
    );
  }

  if (!location || !activeTv || !businessMatches) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Sign TV not found.
      </div>
    );
  }

  const themeClass =
    THEME_CLASSES[settings.backgroundColor ?? "blue"] ?? THEME_CLASSES.blue;
  const isLandscape = settings.tvMounted !== "portrait";
  const rotation =
    settings.tvRotationDirection ?? "translate(-50%, -50%) rotate(-90deg)";

  const containerStyle = isLandscape
    ? {
        width: width || "100vw",
        height: height || "100vh",
      }
    : {
        width: "100vh",
        height: "100vw",
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: rotation,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      };

  return (
    <div className={clsx("relative overflow-hidden", themeClass)} style={containerStyle}>
      <div className="absolute inset-0 flex flex-col overflow-hidden">
        {settings.tickerDisplay === "top" && tickerText ? (
          <SignTvTicker
            text={tickerText}
            size={settings.tickerSize}
            theme={settings.tickerTheme}
          />
        ) : null}

        <div className="relative flex-1 overflow-hidden">
          {visibleGraphics.length === 0 ? (
            <div className="flex h-full items-center justify-center text-2xl text-white/60">
              No graphics assigned
            </div>
          ) : (
            visibleGraphics.map((graphic, index) => (
              <div
                key={`${graphic}-${index}`}
                className={clsx(
                  "absolute inset-0 flex items-center justify-center p-4 relative",
                  index === currentIndex ? "opacity-100" : "opacity-0",
                )}
              >
                <Image
                  src={graphic}
                  alt={`Sign TV graphic ${index + 1}`}
                  fill
                  sizes="100vw"
                  style={{ objectFit: "contain" }}
                  priority={index === currentIndex}
                />
              </div>
            ))
          )}
        </div>

        {settings.tickerDisplay === "bottom" && tickerText ? (
          <SignTvTicker
            text={tickerText}
            size={settings.tickerSize}
            theme={settings.tickerTheme}
          />
        ) : null}
      </div>
    </div>
  );
}
