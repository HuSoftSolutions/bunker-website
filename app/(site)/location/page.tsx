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
import { MenuModal } from "@/components/menus/MenuModal";
import { Button } from "@/components/ui/Button";
import type { LocationRecord } from "@/data/locationConfig";
import useLocations from "@/hooks/useLocations";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useMemo, useState } from "react";

const HERO_IMAGE =
  "https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/main.png";

export default function LocationsPage() {
  const firebase = useFirebase();
  const { locations } = useLocations(firebase);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [menuLocation, setMenuLocation] = useState<Pick<LocationRecord, "name" | "menus"> | null>(null);
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [tourLocation, setTourLocation] = useState<VirtualTourSelection | null>(null);

  const orderedLocations = useMemo(() => {
    return [...locations].sort((a, b) =>
      (a?.name || "").localeCompare(b?.name || ""),
    );
  }, [locations]);

  const openMenuForLocation = (location: LocationRecord) => {
    if (!location || !Array.isArray(location.menus) || !location.menus.length) {
      return;
    }

    setMenuLocation({
      name: location.name,
      menus: location.menus,
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
      name: location.name,
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

      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-8">
        <NearestLocationBanner locations={orderedLocations} />
      </div>

      <section className="relative mx-auto w-full max-w-6xl px-4 py-16">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-8">
            {orderedLocations.map((location) => {
              if (!location) {
                return null;
              }

              const coverImage =
                Array.isArray(location.images) && location.images.length
                  ? location.images[0]
                  : null;
              const bookingUrl =
                typeof location.url === "string" ? location.url : null;

              return (
                <article
                  id={location.id ? `location-${location.id}` : undefined}
                  key={location.id ?? location.name}
                  className="overflow-hidden rounded-3xl border border-white/10   bg-zinc-950 shadow-xl shadow-black/40"
                >
                  <div className="relative h-56 w-full overflow-hidden">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={location.name ?? "Bunker location"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/40">
                        No image available!
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 px-6 py-6">
                    <div className="space-y-3">
                      <h2 className="text-2xl uppercase tracking-wide text-primary">
                        {location.name}
                      </h2>
                      {location.address ? (
                        <p className="text-sm text-white/70">
                          {location.address}
                        </p>
                      ) : null}
                      {location.phone ? (
                        <p className="text-sm font-semibold text-white">
                          {location.phone}
                        </p>
                      ) : null}
                      {location.hoursFull ? (
                        <p className="text-xs uppercase tracking-wide text-white/50">
                          {location.hoursFull}
                        </p>
                      ) : null}
                    </div>

                    {location.coordinates?.lat !== undefined &&
                    location.coordinates?.lng !== undefined ? (
                      <LocationMap
                        lat={location.coordinates.lat}
                        lng={location.coordinates.lng}
                        label={location.name ?? undefined}
                        className="mt-4"
                        heightClassName="h-64"
                        missingKeyMessage="Map preview unavailable."
                      />
                    ) : null}

                    {location.about ? (
                      <p className="text-sm text-white/70">{location.about}</p>
                    ) : null}

                    <LocationAmenities
                      amenities={location.amenities}
                      className="pt-2"
                    />

                    <div className="flex flex-wrap gap-3">
                      {bookingUrl ? (
                        <BookNowButton
                          className="m-0"
                          url={bookingUrl}
                          locationId={location.id}
                          locationName={location.name}
                          fullWidth={false}
                        />
                      ) : null}
                      {typeof location.virtualTourUrl === "string" &&
                      location.virtualTourUrl.trim() ? (
                        <Button
                          variant="ghost"
                          className="m-0"
                          onClick={() => openTourForLocation(location)}
                        >
                          Virtual Tour
                        </Button>
                      ) : null}
                      {Array.isArray(location.menus) && location.menus.length ? (
                        <Button
                          variant="ghost"
                          className="m-0"
                          onClick={() => openMenuForLocation(location)}
                        >
                          Menu
                        </Button>
                      ) : null}
                      {location.email ? (
                        <ExternalLinkButton
                          title="Email"
                          url={`mailto:${location.email}`}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {location.doordash ? (
                        <ExternalLinkButton
                          title="DoorDash"
                          url={location.doordash}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {location.ubereats ? (
                        <ExternalLinkButton
                          title="Uber Eats"
                          url={location.ubereats}
                          className="bg-transparent text-white hover:bg-white/10"
                        />
                      ) : null}
                      {location.mealeo ? (
                        <ExternalLinkButton
                          title="Mealeo"
                          url={location.mealeo}
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
