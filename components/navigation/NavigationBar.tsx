"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { FiChevronDown, FiMenu, FiX } from "react-icons/fi";
import { ImFacebook, ImInstagram } from "react-icons/im";
import * as ROUTES from "@/constants/routes";
import { BookNowButton } from "@/components/buttons/BookNowButton";
import { BookEventsButton } from "@/components/buttons/BookEventsButton";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { LocationSelector } from "@/components/location/LocationSelector";
import { useAuth } from "@/providers/AuthProvider";
import { isAdminOrManager, isDisabled } from "@/utils/auth";

const desktopLogo = "/assets/Bunker_Trademarked_Desktop.png";
const mobileLogo = "/assets/bunker-logo-mobile-site.svg";
const GIFT_CARD_URL =
  "https://www.clover.com/online-ordering/the-bunker-guilderland/giftcard";

const navItems = [
  { type: "link", href: ROUTES.LANDING, label: "Home" },
  { type: "link", href: ROUTES.LOCATION, label: "Locations" },
  { type: "external", href: "https://www.bunkerparties.com", label: "Events" },
  { type: "action", action: "golf", label: "Golf Experiences" },
  { type: "link", href: ROUTES.MENUS, label: "Menus" },
  { type: "action", action: "gift", label: "Gift Cards" },
  { type: "link", href: ROUTES.CAREERS, label: "Careers" },
  { type: "link", href: ROUTES.FAQS, label: "FAQ" },
  { type: "link", href: ROUTES.ABOUT_US, label: "About" },
] as const;

const golfLinks = [
  { href: ROUTES.LESSONS, label: "Lessons" },
  { href: ROUTES.LEAGUES, label: "Leagues" },
  { href: ROUTES.MEMBERSHIP, label: "Memberships" },
  { href: ROUTES.FITTINGS, label: "Fittings" },
  { href: ROUTES.JUNIOR_GOLF, label: "Junior Golf" },
];

export function NavigationBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [golfMenuOpen, setGolfMenuOpen] = useState(false);
  const [giftCardsDialogOpen, setGiftCardsDialogOpen] = useState(false);
  const { authUser } = useAuth();

  const isAllowedAdmin = isAdminOrManager(authUser) && !isDisabled(authUser);

  const toggleGolfMenu = () => setGolfMenuOpen((prev) => !prev);

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur xl:hidden">
        <div className="mx-auto flex w-full max-w-full items-center justify-between px-4 py-3 md:py-4">
          <Link href={ROUTES.LANDING} className="flex items-center gap-2">
            <Image
              src={desktopLogo}
              alt="The Bunker"
              width={180}
              height={48}
              className="hidden h-10 w-auto xl:block"
              priority
            />
            <Image
              src={mobileLogo}
              alt="The Bunker"
              width={160}
              height={44}
              className="block h-8 w-auto xl:hidden"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold uppercase text-white xl:flex">
            <div className="flex items-center gap-6">
              {navItems.map((item) =>
                item.type === "link" ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ) : item.type === "external" ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-primary"
                  >
                    {item.label}
                  </a>
                ) : item.action === "golf" ? (
                  <div key={item.label} className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 transition hover:text-primary"
                      onClick={toggleGolfMenu}
                      aria-expanded={golfMenuOpen}
                      aria-controls="desktop-golf-submenu"
                    >
                      {item.label}
                      <FiChevronDown
                        size={14}
                        className={clsx(
                          "transition-transform",
                          golfMenuOpen ? "rotate-180" : "rotate-0",
                        )}
                      />
                    </button>
                    {golfMenuOpen ? (
                      <div
                        id="desktop-golf-submenu"
                        className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-black/95 p-2 shadow-xl shadow-black/40"
                      >
                        {golfLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="block rounded-xl px-3 py-2 text-xs transition hover:bg-white/10 hover:text-primary"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    className="transition hover:text-primary"
                    onClick={() => setGiftCardsDialogOpen(true)}
                  >
                    {item.label}
                  </button>
                ),
              )}
              {isAllowedAdmin ? (
                <Link
                  href={ROUTES.LOCATION_ADMIN}
                  className="rounded-full border border-primary/40 px-4 py-1 text-xs uppercase tracking-wide text-primary transition hover:bg-primary/10"
                >
                  Admin Panel
                </Link>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/getinthebunker/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white transition hover:text-primary"
                aria-label="Instagram"
              >
                <ImInstagram />
              </a>
              <a
                href="https://www.facebook.com/getinthebunkerNY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white transition hover:text-primary"
                aria-label="Facebook"
              >
                <ImFacebook />
              </a>
            </div>
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            <BookNowButton className="w-auto" />
            <BookEventsButton className="w-auto" />
            <LocationSelector className="w-auto" />
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center justify-center rounded-full border border-white/20 p-2 text-white transition hover:bg-white/10 xl:hidden"
          >
            {mobileOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>

        <div
          className={clsx(
            "xl:hidden",
            mobileOpen
              ? "max-h-[calc(100vh-60px)] overflow-y-auto border-t border-white/10 bg-black/95"
              : "pointer-events-none max-h-0 overflow-hidden",
          )}
        >
          <div className="flex flex-col gap-4 px-4 py-6 text-sm uppercase text-white">
            <BookNowButton className="w-full" />
            <BookEventsButton className="w-full" />
            <LocationSelector className="w-full" />
            {navItems.map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl bg-white/5 px-4 py-2 transition hover:bg-primary/20"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ) : item.type === "external" ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white/5 px-4 py-2 transition hover:bg-primary/20"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <div key={item.label} className="space-y-2">
                  {item.action === "golf" ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-2 text-left uppercase transition hover:bg-primary/20"
                        onClick={toggleGolfMenu}
                        aria-expanded={golfMenuOpen}
                        aria-controls="mobile-golf-submenu"
                      >
                        {item.label}
                        <FiChevronDown
                          size={16}
                          className={clsx(
                            "transition-transform",
                            golfMenuOpen ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </button>
                      {golfMenuOpen ? (
                        <div id="mobile-golf-submenu" className="space-y-2 pl-3">
                          {golfLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="block rounded-xl bg-white/5 px-4 py-2 text-xs transition hover:bg-primary/20"
                              onClick={() => setMobileOpen(false)}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-white/5 px-4 py-2 text-left uppercase transition hover:bg-primary/20"
                      onClick={() => {
                        setMobileOpen(false);
                        setGiftCardsDialogOpen(true);
                      }}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ),
            )}
            {isAllowedAdmin ? (
              <Link
                href={ROUTES.LOCATION_ADMIN}
                className="rounded-xl bg-primary/20 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Admin Panel
              </Link>
            ) : null}
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://www.instagram.com/getinthebunker/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white transition hover:text-primary"
                aria-label="Instagram"
              >
                <ImInstagram />
              </a>
              <a
                href="https://www.facebook.com/getinthebunkerNY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-white transition hover:text-primary"
                aria-label="Facebook"
              >
                <ImFacebook />
              </a>
            </div>
          </div>
        </div>
      </header>

      <aside className="hidden xl:flex xl:sticky xl:top-0 xl:h-screen xl:w-72 2xl:w-80 xl:flex-col xl:overflow-y-auto xl:border-r xl:border-white/10 xl:bg-black/95 xl:px-6 xl:py-8 xl:shadow-lg xl:shadow-black/40 xl:shrink-0">
        <div className="flex h-full flex-col gap-8">
          <Link
            href={ROUTES.LANDING}
            className="flex justify-center"
            aria-label="The Bunker home"
          >
            <Image
              src={desktopLogo}
              alt="The Bunker"
              width={220}
              height={120}
              className="h-auto w-40 2xl:w-48"
              priority
            />
          </Link>

          <div className="flex flex-col gap-3 px-1">
            <BookNowButton />
            <BookEventsButton />
            <LocationSelector />
          </div>

          <nav className="flex flex-col gap-1 text-sm font-semibold uppercase tracking-wide text-white">
            {navItems.map((item) =>
              item.type === "link" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 transition hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ) : item.type === "external" ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-4 py-2 transition hover:bg-white/10"
                >
                  {item.label}
                </a>
              ) : (
                <div key={item.label} className="space-y-1">
                  {item.action === "golf" ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-full px-4 py-2 text-left font-semibold uppercase tracking-wide transition hover:bg-white/10"
                        onClick={toggleGolfMenu}
                        aria-expanded={golfMenuOpen}
                        aria-controls="sidebar-golf-submenu"
                      >
                        {item.label}
                        <FiChevronDown
                          size={14}
                          className={clsx(
                            "transition-transform",
                            golfMenuOpen ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </button>
                      {golfMenuOpen ? (
                        <div id="sidebar-golf-submenu" className="space-y-1 pl-6">
                          {golfLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="block rounded-full px-4 py-2 text-xs transition hover:bg-white/10 hover:text-primary"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-full px-4 py-2 text-left font-semibold uppercase tracking-wide transition hover:bg-white/10"
                      onClick={() => setGiftCardsDialogOpen(true)}
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ),
            )}
          </nav>

          <div className="mt-auto space-y-4 text-white">
            {isAllowedAdmin ? (
              <Link
                href={ROUTES.LOCATION_ADMIN}
                className="flex w-full items-center justify-center rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
              >
                Admin Panel
              </Link>
            ) : null}

            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Follow Us
            </p>
            <div className="flex gap-4 text-lg">
              <a
                href="https://www.instagram.com/getinthebunker/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-primary"
                aria-label="Instagram"
              >
                <ImInstagram />
              </a>
              <a
                href="https://www.facebook.com/getinthebunkerNY"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-primary"
                aria-label="Facebook"
              >
                <ImFacebook />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {giftCardsDialogOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setGiftCardsDialogOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/40">
              <button
                type="button"
                onClick={() => setGiftCardsDialogOpen(false)}
                className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 transition hover:border-primary/50 hover:text-primary"
                aria-label="Close gift cards modal"
              >
                <FiX size={16} />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Gift Cards
              </p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wide text-white">
                The Bunker Gift Cards
              </h2>
              <p className="mt-3 text-sm text-white/70">
                The Bunker gift cards are redeemable at ALL locations.
              </p>
              <div className="mt-6">
                <ExternalLinkButton
                  title="Buy Gift Card"
                  url={GIFT_CARD_URL}
                  className="w-full"
                  large
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
