"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useLocations from "@/hooks/useLocations";
import { useFirebase } from "@/providers/FirebaseProvider";
import { MenuModal } from "@/components/menus/MenuModal";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { NoticeBanner } from "@/components/landing/NoticeBanner";
import useNoticeInfo from "@/hooks/useNoticeInfo";
import type { MenuModalLocation } from "@/components/menus/MenuModal";

const HERO_IMAGE = "https://storage.googleapis.com/thebunker-assets/thebunker/Food%20Wings%20Close%20Up.jpg";

const ORDERING_LINKS: Array<{ key: string; label: string }> = [
  { key: "ubereats", label: "Uber Eats" },
  { key: "doordash", label: "DoorDash" },
  { key: "grubhub", label: "Grub Hub" },
  { key: "mealeo", label: "Mealeo" },
  { key: "riverHouse", label: "River House Room Service" },
];

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const resolveMenuEntries = (value: unknown): NonNullable<MenuModalLocation["menus"]> => {
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

export default function MenusPage() {
  const firebase = useFirebase();
  const { locations } = useLocations(firebase);
  const { noticeInfo } = useNoticeInfo(firebase);
  const [selectedLocation, setSelectedLocation] = useState<MenuModalLocation | null>(null);

  const orderedLocations = useMemo(() => {
    if (!locations.length) {
      return [];
    }
    const order = [
      "cliftonpark",
      "northgreenbush",
      "newhartford",
      "mohawkharbor",
      "saratoga",
      "latham",
      "guilderland",
    ];

    const map = new Map<string, (typeof locations)[number]>();
    locations.forEach((loc) => {
      const locationId = resolveStringValue(loc.id);
      if (locationId) {
        map.set(locationId, loc);
      }
    });
    const ordered: typeof locations = [];
    order.forEach((id) => {
      const entry = map.get(id);
      if (entry) {
        ordered.push(entry);
      }
    });
    locations.forEach((loc) => {
      const locationId = resolveStringValue(loc.id);
      if (!locationId || !order.includes(locationId)) {
        ordered.push(loc);
      }
    });
    return ordered.filter(
      (locationItem) =>
        locationItem &&
        Boolean(resolveStringValue(locationItem.name)),
    );
  }, [locations]);

  return (
    <div className="flex flex-col">
      {noticeInfo?.noticeMsg?.showNoticeMsg ? (
        <NoticeBanner
          title={noticeInfo.noticeMsg.title}
          message={noticeInfo.noticeMsg.message}
          link={noticeInfo.noticeMsg.link}
          linkText={noticeInfo.noticeMsg.linkText}
        />
      ) : null}

      <section className="relative h-64 w-full overflow-hidden md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt="Menus hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative flex h-full w-full items-center justify-center">
          <h1 className="text-4xl font-black uppercase tracking-[0.4em] text-white md:text-5xl">
            Menus
          </h1>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="space-y-4 text-center text-white/80">
          <p>
            Each location offers a variety of unique food and drink options to enjoy during your visit. See below for our menu offerings and stop in for beer and drink specials.
          </p>
          <p>
            Planning a party or group gathering at The Bunker? Submit an inquiry on our{" "}
            <Link
              href="/events"
              className="font-bold text-primary underline-offset-2 transition hover:underline"
            >
              Events
            </Link>{" "}
            page!
          </p>
        </div>

        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
            Location Menus
          </h2>
          <div className="h-px w-full bg-white/10" />

          <div className="space-y-6">
            {orderedLocations.map((location) => {
              const locationName = resolveStringValue(location.name, "Location");
              const locationId = resolveStringValue(location.id);
              const menus = resolveMenuEntries(location.menus);
              const hasBrunchMenu = menus.some((menu) => {
                const name = resolveStringValue(menu?.name).toLowerCase();
                const hasPdf = Boolean(
                  resolveStringValue(menu?.pdf) ||
                    resolveStringValue(menu?.storagePath),
                );
                return hasPdf && name.includes("brunch");
              });

              return (
                <div
                  key={locationId || locationName}
                  className="rounded-3xl border border-zinc-200/80 bg-white p-4 text-zinc-900 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLocation({
                            name: locationName,
                            menus,
                          })
                        }
                        className="text-left text-xl font-semibold uppercase tracking-wide text-primary transition hover:text-primary/80"
                      >
                        {locationName} Menu
                      </button>
                      {hasBrunchMenu ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                          Brunch Available
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ORDERING_LINKS.map(({ key, label }) => {
                        const url = resolveStringValue(location[key]);
                        if (!url) {
                          return null;
                        }
                        return (
                          <ExternalLinkButton
                            key={key}
                            title={label}
                            url={url}
                            className="bg-zinc-900 text-xs text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-black/30"
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MenuModal
        location={selectedLocation}
        open={Boolean(selectedLocation)}
        onClose={() => setSelectedLocation(null)}
      />
    </div>
  );
}
