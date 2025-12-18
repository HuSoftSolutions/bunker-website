"use client";

import { Calendar } from "@/components/calendar/Calendar";
import { Button } from "@/components/ui/Button";
import Firebase from "@/lib/firebase/client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CalendarModalProps = {
  location: Record<string, any> | null;
  firebase: Firebase;
  onClose: () => void;
  show: boolean;
};

export function CalendarModal({
  location,
  firebase,
  onClose,
  show,
}: CalendarModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!show || !location || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="fixed inset-0 bg-black/70" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:p-10">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-white/5 bg-zinc-950 px-6 py-5">
              <div className="space-y-1 text-white">
                <h2 className="text-2xl">{location.name} Calendar</h2>
                {location.address ? (
                  <p className="text-sm text-white/60">{location.address}</p>
                ) : null}
              </div>

              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
              <Calendar location={location} firebase={firebase} />
            </div>
          </div>
        </div>
      </div>
    </div>
    , document.body,
  );
}
