"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { SignTvTicker } from "@/components/signTv/SignTvTicker";
import { SIGN_TV_BUSINESS_ID } from "@/constants/routes";
import { SIGNTV_USER_ID } from "@/constants/signTv";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { useSignTvFirebase } from "@/providers/SignTvFirebaseProvider";
import type SignTvFirebase from "@/lib/firebase/signTvClient";

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

type SignTvGraphic = {
  id: string;
  url: string;
  hidden?: boolean;
  locations?: string[];
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
  const firebase = useSignTvFirebase() as SignTvFirebase;
  const { width, height } = useWindowDimensions();
  const [location, setLocation] = useState<Record<string, unknown> | null>(null);
  const [graphics, setGraphics] = useState<SignTvGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const params = useParams<SignTvParams>();
  const businessParam =
    typeof params?.businessId === "string" ? params.businessId : "";
  const tvId = typeof params?.tvId === "string" ? params.tvId : "";
  const businessId = SIGN_TV_BUSINESS_ID;
  const signTvUserId = SIGNTV_USER_ID;

  useEffect(() => {
    if (!tvId || !signTvUserId) {
      return undefined;
    }

    setLoading(true);
    const locationRef = doc(
      firebase.db,
      "users",
      signTvUserId,
      "locations",
      tvId,
    );
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
  }, [firebase.db, signTvUserId, tvId]);

  useEffect(() => {
    if (!tvId || !signTvUserId) {
      setGraphics([]);
      return undefined;
    }

    const graphicsRef = collection(
      firebase.db,
      "users",
      signTvUserId,
      "images",
    );

    const unsubscribe = onSnapshot(graphicsRef, (snapshot) => {
      const next = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          url: resolveStringValue(data?.url),
          hidden: Boolean(data?.hidden),
          locations: Array.isArray(data?.locations) ? data.locations : [],
        } satisfies SignTvGraphic;
      });

      setGraphics(next);
    });

    return () => unsubscribe();
  }, [firebase.db, signTvUserId, tvId]);

  const settings = useMemo(
    () => resolveSignTvSettings((location?.tvSettings ?? {}) as SignTvSettings),
    [location],
  );

  const tickerText =
    resolveStringValue(location?.tickerText) ||
    resolveStringValue(location?.signTvTickerText);

  const businessMatches = !location ? true : businessParam === businessId;

  const visibleGraphics = useMemo(() => {
    return graphics
      .filter((graphic) => {
        if (!graphic.url || graphic.hidden) {
          return false;
        }

        if (!tvId) {
          return false;
        }

        return Array.isArray(graphic.locations)
          ? graphic.locations.includes(tvId)
          : false;
      })
      .map((graphic) => graphic.url);
  }, [graphics, tvId]);

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

  if (!location || !businessMatches || !signTvUserId) {
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
