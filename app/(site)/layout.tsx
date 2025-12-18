import type { Metadata } from "next";
import { NavigationBar } from "@/components/navigation/NavigationBar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "The Bunker | Indoor Golf & Lounge",
  description:
    "Luxury sports bar, indoor golf, food, music, and lounge — experience The Bunker.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/assets/background.svg')] bg-cover bg-center bg-fixed"
        style={{ filter: "grayscale(100%)" }}
      >
        <div className="h-full w-full bg-black/80" />
      </div>

      <div className="relative z-10 bg-gradient-to-b from-black/80 via-zinc-950/90 to-black/85">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <NavigationBar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
