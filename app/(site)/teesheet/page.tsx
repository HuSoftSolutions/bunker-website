"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useLocations from "@/hooks/useLocations";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import { useFirebase } from "@/providers/FirebaseProvider";

const HTTPS_PROTOCOL = /^https?:\/\//i;
const LOCAL_TEESHEET_URL = "http://localhost:5173/location/thebunker";

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const sanitizeUrl = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  if (!HTTPS_PROTOCOL.test(value)) {
    return null;
  }

  return value;
};

export default function TeesheetPage() {
  const searchParams = useSearchParams();
  const firebase = useFirebase();

  const { locations } = useLocations(firebase);
  const {
    settings: businessSettings,
    loading: businessSettingsLoading,
  } = useBusinessSettings(firebase);

  const requestedUrl = sanitizeUrl(searchParams.get("url"));
  const locationIdParam = searchParams.get("locationId");
  const locationNameParam = searchParams.get("locationName");

  const fallbackUrl = sanitizeUrl(
    resolveStringValue(
      process.env.NODE_ENV === "development"
        ? LOCAL_TEESHEET_URL
        : businessSettings?.teesheetUrl,
    ),
  );
  const embedUrl = requestedUrl ?? fallbackUrl;

  const activeLocation = useMemo(() => {
    if (locationIdParam) {
      return (
        locations.find(
          (location) => resolveStringValue(location?.id) === locationIdParam,
        ) ?? null
      );
    }

    if (requestedUrl) {
      return (
        locations.find(
          (location) =>
            resolveStringValue(location?.url) === requestedUrl,
        ) ?? null
      );
    }

    return null;
  }, [locations, locationIdParam, requestedUrl]);

  const activeLocationName = resolveStringValue(activeLocation?.name);
  const title =
    locationNameParam ??
    (activeLocationName || null) ??
    (embedUrl ? "The Bunker Teesheet" : "Book Your Bay");

  const showFallbackNotice = !embedUrl && !businessSettingsLoading;

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col bg-gradient-to-b from-black via-zinc-950 to-black text-white sm:h-auto sm:min-h-screen">
      {/* Open-in-new-window icon pinned into the nav bar, left of hamburger */}
      {embedUrl ? (
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-16 top-3 z-50 flex items-center justify-center rounded-full border border-white/20 p-2 text-white transition hover:bg-white/10"
          aria-label="Open Teesheet In New Window"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ) : null}

      <div className="relative flex flex-1 flex-col">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="payment; fullscreen; geolocation"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="max-w-md space-y-4 rounded-3xl border border-white/10 bg-zinc-900/80 p-8 text-center shadow-2xl shadow-black/40">
              <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
                Teesheet Link Unavailable
              </h2>
              <p className="text-sm text-white/70">
                {businessSettingsLoading
                  ? "Loading teesheet preferences…"
                  : "Add a business teesheet link from the admin panel to enable direct booking."}
              </p>
              {showFallbackNotice ? (
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Business Settings → Teesheet Link
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
