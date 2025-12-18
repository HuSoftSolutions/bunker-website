"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { loadGoogleMapsApi } from "@/utils/googleMaps";
import { createLocationMarkerIcon } from "@/utils/mapIcons";

type LocationMapProps = {
  lat?: number | string | null;
  lng?: number | string | null;
  zoom?: number;
  className?: string;
  heightClassName?: string;
  label?: string;
  missingKeyMessage?: string;
};

const parseCoordinate = (value: LocationMapProps["lat"]) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }
  return null;
};

export function LocationMap({
  lat,
  lng,
  zoom = 14,
  className,
  heightClassName = "h-64",
  label,
  missingKeyMessage,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapsApi, setMapsApi] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const apiKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", []);
  const missingKeyText =
    missingKeyMessage ??
    "Map preview unavailable. Add a Google Maps API key to enable this feature.";

  const center = useMemo(() => {
    const latValue = parseCoordinate(lat);
    const lngValue = parseCoordinate(lng);
    if (latValue === null || lngValue === null) {
      return null;
    }
    return { lat: latValue, lng: lngValue };
  }, [lat, lng]);

  useEffect(() => {
    if (!apiKey) {
      setLoadError(missingKeyText);
      return;
    }
    let cancelled = false;
    loadGoogleMapsApi(apiKey)
      .then((maps) => {
        if (!cancelled) {
          setMapsApi(maps);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, missingKeyText]);

  useEffect(() => {
    if (!mapsApi || !center || !containerRef.current) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new mapsApi.Map(containerRef.current, {
        center,
        zoom,
        disableDefaultUI: true,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }

    if (!markerRef.current) {
      markerRef.current = new mapsApi.Marker({
        position: center,
        map: mapInstanceRef.current ?? undefined,
        title: label,
        icon: createLocationMarkerIcon(mapsApi),
      });
    } else {
      markerRef.current.setPosition(center);
      if (label) {
        markerRef.current.setTitle(label);
      }
      markerRef.current.setIcon(createLocationMarkerIcon(mapsApi));
    }

    setIsReady(true);
  }, [center, label, mapsApi, zoom]);

  let content: React.ReactNode = null;
  if (loadError) {
    content = (
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80 px-4 text-center text-sm text-rose-200">
        {loadError}
      </div>
    );
  } else if (!center) {
    content = (
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 px-4 text-center text-sm text-white/60">
        Enter valid latitude and longitude to preview the map.
      </div>
    );
  } else if (!isReady) {
    content = (
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 text-sm text-white/60">
        Loading map…
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40",
        heightClassName,
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {content}
    </div>
  );
}
