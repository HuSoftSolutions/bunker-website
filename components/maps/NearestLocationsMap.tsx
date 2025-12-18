"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { loadGoogleMapsApi } from "@/utils/googleMaps";
import { createLocationMarkerIcon, createUserMarkerIcon } from "@/utils/mapIcons";

type MarkerPoint = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  isUser?: boolean;
};

export type NearestLocationsMapProps = {
  markers: MarkerPoint[];
  userMarker?: {
    id: string;
    lat: number;
    lng: number;
  } | null;
  className?: string;
  heightClassName?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

export function NearestLocationsMap({
  markers,
  userMarker,
  className,
  heightClassName = "h-64",
}: NearestLocationsMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());

  const [mapsApi, setMapsApi] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", []);
  const hasMaps = Boolean(mapsApi);

  const missingKeyText = "Map preview unavailable. Add a Google Maps API key to enable this feature.";

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
  }, [apiKey]);

  const displayMarkers = useMemo(() => {
    if (userMarker) {
      return [{ ...userMarker, isUser: true }, ...markers];
    }
    return markers;
  }, [markers, userMarker]);

  const bounds = useMemo(() => {
    if (!displayMarkers.length || !mapsApi) {
      return null;
    }
    const computedBounds = new mapsApi.LatLngBounds();
    displayMarkers.forEach((marker) => {
      computedBounds.extend(new mapsApi.LatLng(marker.lat, marker.lng));
    });
    return computedBounds;
  }, [displayMarkers, mapsApi]);

  useEffect(() => {
    if (!mapsApi || !mapRef.current) {
      return;
    }

    const googleMaps = mapsApi;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new googleMaps.Map(mapRef.current, {
        center: displayMarkers[0]
          ? { lat: displayMarkers[0].lat, lng: displayMarkers[0].lng }
          : { lat: 42.6526, lng: -73.7562 },
        zoom: 11,
        disableDefaultUI: true,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
      });
    }

    const googleMap = mapInstanceRef.current;
    const existingMarkers = markerRefs.current;

    // Remove markers no longer present
    existingMarkers.forEach((marker, id) => {
      if (!displayMarkers.find((point) => point.id === id)) {
        marker.setMap(null);
        existingMarkers.delete(id);
      }
    });

    // Add/update markers
    displayMarkers.forEach((point) => {
      let mapMarker = existingMarkers.get(point.id);
      if (!mapMarker) {
        mapMarker = new googleMaps.Marker({
          map: googleMap,
          position: { lat: point.lat, lng: point.lng },
          title: point.title,
          icon: point.isUser
            ? createUserMarkerIcon(googleMaps)
            : createLocationMarkerIcon(googleMaps),
        });
        existingMarkers.set(point.id, mapMarker);
      } else {
        mapMarker.setPosition({ lat: point.lat, lng: point.lng });
        mapMarker.setTitle(point.title ?? "");
        mapMarker.setIcon(
          point.isUser
            ? createUserMarkerIcon(googleMaps)
            : createLocationMarkerIcon(googleMaps),
        );
      }
    });

    if (bounds) {
      googleMap.fitBounds(bounds, 60);
    } else if (displayMarkers[0]) {
      googleMap.setCenter({ lat: displayMarkers[0].lat, lng: displayMarkers[0].lng });
      googleMap.setZoom(11);
    }
  }, [displayMarkers, bounds, mapsApi]);

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-black/60",
        heightClassName,
        className,
      )}
    >
      <div ref={mapRef} className="absolute inset-0" />
      {!mapsApi ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
          {loadError ?? "Loading map…"}
        </div>
      ) : null}
    </div>
  );
}
