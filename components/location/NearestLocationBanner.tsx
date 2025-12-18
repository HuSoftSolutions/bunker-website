"use client";

import { NearestLocationsMap } from "@/components/maps/NearestLocationsMap";
import { getDistanceInMiles, isValidCoordinate, type GeoPoint } from "@/utils/geo";
import { ArrowRightIcon, MapPinIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useMemo, useState } from "react";

type LocationRecord = {
  id?: string;
  name?: string;
  address?: string;
  url?: string | null;
  coordinates?: {
    lat?: number | null;
    lng?: number | null;
  } | null;
};

type LocationWithCoords = LocationRecord & {
  coordinates: {
    lat: number;
    lng: number;
  };
};

type NearestLocationBannerProps = {
  locations: LocationRecord[];
};

type Status = "idle" | "locating" | "error" | "success";

export function NearestLocationBanner({ locations }: NearestLocationBannerProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nearestLocations, setNearestLocations] = useState<Array<{
    location: LocationWithCoords;
    distance: number;
  }> | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<GeoPoint | null>(null);

  const hasGeolocation = typeof navigator !== "undefined" && "geolocation" in navigator;

  const validLocations = useMemo<LocationWithCoords[]>(() => {
    return locations.filter((location): location is LocationWithCoords => {
      const lat = location.coordinates?.lat;
      const lng = location.coordinates?.lng;
      return isValidCoordinate(lat) && isValidCoordinate(lng);
    });
  }, [locations]);

  const formatDistance = useCallback((distance: number) => {
    return `${distance.toFixed(distance > 50 ? 0 : 1)} miles`;
  }, []);

  const handleFindNearest = useCallback(() => {
    if (!hasGeolocation) {
      setStatus("error");
      setErrorMessage("This browser does not support location services.");
      return;
    }

    if (!validLocations.length) {
      setStatus("error");
      setErrorMessage("We couldn't find location coordinates to compare against.");
      return;
    }

    setStatus("locating");
    setErrorMessage(null);
    setUserCoordinates(null);
    setNearestLocations(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const ranked = validLocations
          .map((location) => ({
            location,
            distance: getDistanceInMiles(currentPoint, {
              lat: location.coordinates.lat,
              lng: location.coordinates.lng,
            }),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);

        if (ranked.length) {
          setNearestLocations(ranked);
          setUserCoordinates(currentPoint);
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMessage("We couldn't determine the nearest location right now.");
        }
      },
      (error) => {
        setStatus("error");
        setUserCoordinates(null);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage("Please allow location access to find the nearest Bunker.");
        } else {
          setErrorMessage("Unable to retrieve your location. Try again in a moment.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }, [hasGeolocation, validLocations]);

  const renderContent = () => {
    if (status === "success" && nearestLocations && nearestLocations.length) {
      const [primary] = nearestLocations;
      const anchorId = primary.location.id ? `location-${primary.location.id}` : undefined;
      const formattedDistance = formatDistance(primary.distance);

      return (
        <div className="flex flex-col gap-3 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Nearest Location
            </span>
            <p className="text-lg font-semibold text-white">
              {primary.location.name ?? "The Bunker"}
              <span className="ml-2 text-sm font-normal text-white/60">{formattedDistance} away</span>
            </p>
            {primary.location.address ? (
              <p className="text-xs text-white/60">{primary.location.address}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {anchorId ? (
              <a
                href={`#${anchorId}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
              >
                View Details
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            ) : null}
            {primary.location.url ? (
              <a
                href={primary.location.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
              >
                Book Now
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
            <MapPinIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Find a Bunker near you</p>
            <p className="text-xs text-white/60">
              Tap below and we&apos;ll match you with the closest location based on your device.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFindNearest}
            disabled={status === "locating"}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
              status === "locating"
                ? "cursor-wait bg-white/10 text-white/70"
                : "bg-white/5 text-white hover:bg-white/10",
            )}
          >
            {status === "locating" ? "Locating…" : "Use my location"}
          </button>
          {!hasGeolocation ? (
            <span className="text-xs text-white/40">Location services unavailable in this browser.</span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10    bg-zinc-950 p-6 shadow-lg shadow-black/40">
        {renderContent()}
        {status === "error" && errorMessage ? (
          <p className="mt-3 text-xs text-rose-300">{errorMessage}</p>
        ) : null}
      </div>
      {status === "success" && nearestLocations && nearestLocations.length ? (
        <>
          <NearestLocationsMap
            markers={nearestLocations.map(({ location }, index) => ({
              id: location.id ? `loc-${location.id}` : `loc-${index}`,
              lat: location.coordinates.lat,
              lng: location.coordinates.lng,
              title: location.name,
            }))}
            userMarker={
              userCoordinates
                ? {
                    id: "user",
                    lat: userCoordinates.lat,
                    lng: userCoordinates.lng,
                  }
                : null
            }
            className="overflow-hidden rounded-3xl border border-white/10    bg-zinc-950"
            heightClassName="h-72"
          />
          <div className="rounded-3xl border border-white/10   bg-zinc-950 p-6 shadow-inner shadow-black/20">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Closest Bunker Locations
            </h4>
            <ul className="mt-4 space-y-3">
              {nearestLocations.map(({ location, distance }, index) => {
                const anchorId = location.id ? `location-${location.id}` : undefined;
                return (
                  <li
                    key={location.id ?? `${location.name}-${index}`}
                    className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/70 transition hover:border-primary/40 hover:bg-white/10 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {location.name ?? "The Bunker"}
                      </p>
                      <p className="text-xs text-white/50">
                        {formatDistance(distance)}
                        {location.address ? ` • ${location.address}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {anchorId ? (
                        <a
                          href={`#${anchorId}`}
                          className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                        >
                          View
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {location.url ? (
                        <a
                          href={location.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
                        >
                          Book
                          <ArrowRightIcon className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
