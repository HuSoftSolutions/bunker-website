"use client";

import { useState } from "react";
import clsx from "clsx";
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { CalendarModal } from "@/components/location/CalendarModal";
import { useFirebase } from "@/providers/FirebaseProvider";
import useLocations from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";

type LocationSelectorProps = {
  className?: string;
};

export function LocationSelector({ className }: LocationSelectorProps) {
  const firebase = useFirebase();
  const { locations } = useLocations(firebase);
  const [selectedLocation, setSelectedLocation] = useState<Record<
    string,
    any
  > | null>(null);

  return (
    <>
      <div className={clsx("flex w-full", className)}>
        <Menu as="div" className="relative w-full">
          <Menu.Button className="relative flex w-full items-center justify-center rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span>Events Calendar</span>
            <ChevronDownIcon className="pointer-events-none absolute right-5 h-4 w-4" />
          </Menu.Button>

          <Transition
            enter="transition duration-150 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-100 ease-in"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
            as={Fragment}
          >
            <Menu.Items className="absolute left-0 z-40 mt-2 w-full min-w-[220px] rounded-2xl border border-white/10 bg-zinc-900/95 p-1 shadow-2xl shadow-black/40 backdrop-blur">
              {locations.map((location) => (
                <Menu.Item key={location.id}>
                  {({ active }) => (
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(location)}
                      className={clsx(
                        "w-full rounded-xl px-4 py-2 text-left text-sm text-white transition",
                        active ? "bg-primary/20 text-primary" : "bg-transparent",
                      )}
                    >
                      {location.name}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      <CalendarModal
        show={Boolean(selectedLocation)}
        location={selectedLocation}
        firebase={firebase as Firebase}
        onClose={() => setSelectedLocation(null)}
      />
    </>
  );
}
