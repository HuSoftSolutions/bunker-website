"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useLocations from "@/hooks/useLocations";
import useBusinessSettings from "@/hooks/useBusinessSettings";
import { useFirebase } from "@/providers/FirebaseProvider";

const HTTPS_PROTOCOL = /^https?:\/\//i;

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
    resolveStringValue(businessSettings?.teesheetUrl),
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
  const activeLocationAddress = resolveStringValue(activeLocation?.address);

  const showFallbackNotice = !embedUrl && !businessSettingsLoading;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <header className="border-b border-white/10 bg-black/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
              Book Now
            </p>
            <h1 className="text-2xl font-semibold uppercase tracking-wide md:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Reserve your time without leaving The Bunker experience.
            </p>
            {activeLocationAddress ? (
              <p className="mt-1 text-xs uppercase tracking-wide text-white/50">
                {activeLocationAddress}
              </p>
            ) : null}
          </div>
          {embedUrl ? (
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Open in New Tab
            </a>
          ) : null}
        </div>
      </header>

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
