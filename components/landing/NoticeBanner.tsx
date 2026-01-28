"use client";

import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type NoticeBannerProps = {
  title?: string;
  message?: string;
  link?: string;
  linkText?: string;
  className?: string;
};

export function NoticeBanner({
  title,
  message,
  link,
  linkText,
  className,
}: NoticeBannerProps) {
  if (!title && !message) {
    return null;
  }

  return (
    <div className={clsx("flex w-full flex-col bg-primary text-white", className)}>
      <div className="flex flex-col items-center gap-2 px-4 py-3 text-center md:flex-row md:flex-wrap md:justify-center md:gap-3 md:py-2 md:text-left">
        {title ? (
          <p className="text-sm font-semibold uppercase tracking-wide md:text-xs">
            {title}
          </p>
        ) : null}
        {message ? <p className="text-sm md:text-xs">{message}</p> : null}
        {link ? (
          <Button
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            className="mt-1 md:mt-0"
          >
            {linkText || "Click Here"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
