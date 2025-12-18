"use client";

import Link from "next/link";
import clsx from "clsx";

type ExternalLinkButtonProps = {
  title: string;
  url: string;
  dark?: boolean;
  large?: boolean;
  className?: string;
};

export function ExternalLinkButton({
  title,
  url,
  dark,
  large,
  className,
}: ExternalLinkButtonProps) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
        dark ? "bg-black text-white hover:bg-black/80" : "bg-primary text-white hover:bg-primary-dark",
        large && "text-sm px-6 py-3",
        className,
      )}
    >
      {title}
    </Link>
  );
}
