"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export type VirtualTourSelection = {
  name?: string;
  virtualTourUrl: string;
};

type VirtualTourModalProps = {
  location: VirtualTourSelection | null;
  open: boolean;
  onClose: () => void;
};

export function VirtualTourModal({
  location,
  open,
  onClose,
}: VirtualTourModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open || !location?.virtualTourUrl) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 md:px-8"
      role="dialog"
      aria-modal="true"
      aria-label={
        location.name
          ? `${location.name} virtual tour`
          : "Virtual tour preview"
      }
    >
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full border border-white/15 p-2 text-white/70 transition hover:border-primary/50 hover:text-primary"
          aria-label="Close virtual tour"
        >
          <FiX size={18} />
        </button>

        <div className="space-y-4 px-6 pt-8 pb-4 text-white">
          {location.name ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Virtual Tour
              </p>
              <h2 className="text-2xl font-bold uppercase tracking-wide">
                {location.name}
              </h2>
            </div>
          ) : null}
          <div className="relative h-0 overflow-hidden rounded-2xl border border-white/10 pb-[56.25%]">
            <iframe
              title={
                location.name
                  ? `${location.name} virtual tour`
                  : "Virtual tour"
              }
              src={location.virtualTourUrl}
              allow="xr-spatial-tracking"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 h-full w-full rounded-2xl"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
