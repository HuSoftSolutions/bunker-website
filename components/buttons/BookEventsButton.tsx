"use client";

import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type BookEventsButtonProps = {
  className?: string;
};

export function BookEventsButton({ className }: BookEventsButtonProps) {
  return (
    <div className={clsx("flex w-full", className)}>
      <Button
        className="w-full"
        onClick={() => {
          window.location.href = "https://www.bunkerparties.com";
        }}
      >
        Book Event
      </Button>
    </div>
  );
}
