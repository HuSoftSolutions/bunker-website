"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type BookNowButtonProps = {
  url?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  className?: string;
  fullWidth?: boolean;
};

export function BookNowButton({
  url,
  locationId,
  locationName,
  className,
  fullWidth = true,
}: BookNowButtonProps) {
  const router = useRouter();

  return (
    <div className={clsx(fullWidth ? "flex w-full" : "inline-flex", className)}>
      <Button
        className={clsx(fullWidth && "w-full")}
        onClick={() => {
          const params = new URLSearchParams();
          if (url) {
            params.set("url", url);
          }
          if (locationId) {
            params.set("locationId", locationId);
          }
          if (locationName) {
            params.set("locationName", locationName);
          }

          const search = params.toString();
          router.push(search ? `/teesheet?${search}` : "/teesheet");
        }}
      >
        Book Now
      </Button>
    </div>
  );
}
