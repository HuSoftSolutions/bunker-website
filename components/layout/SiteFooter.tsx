"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const hideOnTeesheet = pathname?.startsWith("/teesheet");

  return (
    <footer
      className={`${hideOnTeesheet ? "hidden xl:block" : "block"} bg-black py-8 text-center text-xs font-semibold uppercase tracking-wide text-white/60`}
    >
      © {new Date().getFullYear()} The Bunker. All Rights Reserved.
    </footer>
  );
}
