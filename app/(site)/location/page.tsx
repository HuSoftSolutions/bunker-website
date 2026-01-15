"use client";

import { BookNowButton } from "@/components/buttons/BookNowButton";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { PageHero } from "@/components/layout/PageHero";
import { LocationAmenities } from "@/components/location/LocationAmenities";
import { LocationSelector } from "@/components/location/LocationSelector";
import { NearestLocationBanner } from "@/components/location/NearestLocationBanner";
import { LocationMap } from "@/components/maps/LocationMap";
import { VirtualTourModal } from "@/components/location/VirtualTourModal";
import type { VirtualTourSelection } from "@/components/location/VirtualTourModal";
import { MenuModal, type MenuModalLocation } from "@/components/menus/MenuModal";
import { Button } from "@/components/ui/Button";
import type { LocationRecord } from "@/data/locationConfig";
import useLocations from "@/hooks/useLocations";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useMemo, useState } from "react";

const HERO_IMAGE =
  "https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/main.png";

type ResolvedAmenity = {
  icon: string;
  title: string;
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const resolveRecordValue = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const resolveMenuEntries = (
  value: unknown,
): NonNullable<MenuModalLocation["menus"]> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (menu): menu is Record<string, unknown> =>
        Boolean(menu) && typeof menu === "object",
    )
    .map((menu) => {
      const name = resolveStringValue(menu.name);
      const pdf =
        resolveStringValue(menu.pdf) ||
        resolveStringValue(menu.downloadUrl) ||
        resolveStringValue(menu.url);
      const storagePath = resolveStringValue(menu.storagePath);

      const entry: { name?: string; pdf?: string; storagePath?: string } = {};
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
    })
    .filter((menu) => menu.name || menu.pdf || menu.storagePath);
};

const resolveAmenities = (value: unknown): ResolvedAmenity[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (amenity): amenity is Record<string, unknown> =>
        Boolean(amenity) && typeof amenity === "object",
    )
    .map((amenity) => ({
      icon: resolveStringValue(amenity.icon),
      title: resolveStringValue(amenity.title),
    }))
    .filter((amenity) => amenity.icon && amenity.title);
};

export default function LocationsPage() {
  const firebase = useFirebase();
  const { locations } = useLocations(firebase);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuLocation, setMenuLocation] = useState<MenuModalLocation | null>(null);
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [tourLocation, setTourLocation] = useState<VirtualTourSelection | null>(null);

  const orderedLocations = useMemo(() => {
    return [...locations].sort((a, b) =>
      resolveStringValue(a?.name).localeCompare(resolveStringValue(b?.name)),
    );
  }, [locations]);

  const openMenuForLocation = (location: LocationRecord) => {
    const menus = resolveMenuEntries(location?.menus);
    if (!menus.length) {
      return;
    }

    setMenuLocation({
      name: resolveStringValue(location.name),
      menus,
    });
    setMenuModalOpen(true);
  };

  const closeMenuModal = () => {
    setMenuModalOpen(false);
    setMenuLocation(null);
  };

  const openTourForLocation = (location: LocationRecord) => {
    const virtualTourUrl =
      typeof location.virtualTourUrl === "string"
        ? location.virtualTourUrl.trim()
        : "";
    if (!virtualTourUrl) {
      return;
    }

    setTourLocation({
      name: resolveStringValue(location.name),
      virtualTourUrl,
    });
    setTourModalOpen(true);
  };

  const closeTourModal = () => {
    setTourModalOpen(false);
    setTourLocation(null);
  };

  return (
    <div className="flex flex-col">
      <PageHero
        title="Locations"
        subtitle="Find Your Bunker"
        description="Visit any of our indoor golf lounges for immersive TrackMan bays, handcrafted menus, and unforgettable events."
        imageUrl={HERO_IMAGE}
        imageAlt="The Bunker location interior"
      />

      <div className="mx-auto w-full max-w-full px-4 pt-12 pb-8">
        <NearestLocationBanner locations={orderedLocations} />
      </div>

      <section className="relative mx-auto w-full max-w-full px-4 py-16">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-8">
            {orderedLocations.map((location) => {
              if (!location) {
                return null;
              }

              const images = Array.isArray(location.images)
                ? location.images.filter(
                    (image): image is string =>
                      typeof image === "string" && Boolean(image.trim()),
                  )
                : [];
              const coverImage = images.length ? images[0] : null;
              const bookingUrl = resolveStringValue(location.url);
              const locationId = resolveStringValue(location.id);
              const locationName = resolveStringValue(location.name, "Location");
              const locationAddress = resolveStringValue(location.address);
              const locationPhone = resolveStringValue(location.phone);
              const locationHours = resolveStringValue(location.hoursFull);
              const locationAbout = resolveStringValue(location.about);
              const locationEmail = resolveStringValue(location.email);
              const doordashUrl = resolveStringValue(location.doordash);
              const uberEatsUrl = resolveStringValue(location.ubereats);
              const mealeoUrl = resolveStringValue(location.mealeo);
              const menus = resolveMenuEntries(location.menus);
              const amenities = resolveAmenities(location.amenities);
              const coords = resolveRecordValue(location.coordinates);
              const lat = typeof coords?.lat === "number" ? coords.lat : null;
              const lng = typeof coords?.lng === "number" ? coords.lng : null;
              const virtualTourUrl = resolveStringValue(location.virtualTourUrl);

              return (
                <article
                  id={locationId ? `location-${locationId}` : undefined}
                  key={locationId || locationName}
                  className="overflow-hidden rounded-3xl border border-white/10   bg-zinc-950 shadow-xl shadow-black/40"
                >
                  <div className="relative h-56 w-full overflow-hidden">
                    {coverImage ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImage}
                          alt={locationName || "Bunker location"}
                          className="h-full w-full object-cover"
                        />
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/40">
                        No image available!
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 px-6 py-6">
                    <div className="space-y-3">
                      <h2 className="text-2xl uppercase tracking-wide text-primary">
                        {locationName}
                      </h2>
                      {locationAddress ? (
                        <p className="text-sm text-white/70">
                          {locationAddress}
                        </p>
                      ) : null}
                      {locationPhone ? (
                        <p className="text-sm font-semibold text-white">
                          {locationPhone}
                        </p>
                      ) : null}
                      {locationHours ? (
                        <p className="text-xs uppercase tracking-wide text-white/50">
                          {locationHours}
                        </p>
                      ) : null}
                    </div>

                    {lat !== null && lng !== null ? (
                      <LocationMap
                        lat={lat}
                        lng={lng}
                        label={locationName || undefined}
                        className="mt-4"
                        heightClassName="h-64"
                        missingKeyMessage="Map preview unavailable."
                      />
                    ) : null}

                    {locationAbout ? (
                      <p className="text-sm text-white/70">{locationAbout}</p>
                    ) : null}

                    <LocationAmenities
                      amenities={amenities.length ? amenities : undefined}
                      className="pt-2"
                    />

                    <div className="flex flex-wrap gap-3">
                      {bookingUrl ? (
                        <BookNowButton
                          className="m-0"
                          url={bookingUrl}
                          locationId={locationId || undefined}
                          locationName={locationName || undefined}
                          fullWidth={false}
                        />
                      ) : null}
                      {virtualTourUrl ? (
                        <Button
                          variant="ghost"
                          className="m-0"
                          onClick={() => openTourForLocation(location)}
                        >
                          Virtual Tour
                        </Button>
                      ) : null}
                      {menus.length ? (
                        <Button
                          variant="ghost"
                          className="m-0"
                          onClick={() => openMenuForLocation(location)}
                        >
                          Menu
                        </Button>
                      ) : null}
                      {locationEmail ? (
                        <ExternalLinkButton
                          title="Email"
                          url={`mailto:${locationEmail}`}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {doordashUrl ? (
                        <ExternalLinkButton
                          title="DoorDash"
                          url={doordashUrl}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {uberEatsUrl ? (
                        <ExternalLinkButton
                          title="Uber Eats"
                          url={uberEatsUrl}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {mealeoUrl ? (
                        <ExternalLinkButton
                          title="Mealeo"
                          url={mealeoUrl}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}

            {!orderedLocations.length ? (
              <p className="rounded-3xl border border-white/10   bg-zinc-950 px-6 py-12 text-center text-white/60">
                We are refreshing our locations. Check back soon for the latest
                openings.
              </p>
            ) : null}
          </div>

          <aside className="space-y-6 rounded-3xl border border-white/10   bg-zinc-950 p-6 shadow-xl shadow-black/40 lg:sticky lg:top-28">
            <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
              Plan Your Visit
            </h3>
            <p className="text-sm text-white/70">
              Browse our calendar to see upcoming events, specials, and leagues
              at each Bunker location.
            </p>
            <LocationSelector className="m-0" />
          </aside>
        </div>
      </section>

      <MenuModal
        location={menuLocation}
        open={menuModalOpen}
        onClose={closeMenuModal}
      />
      <VirtualTourModal
        location={tourLocation}
        open={tourModalOpen}
        onClose={closeTourModal}
      />
    </div>
  );
}
