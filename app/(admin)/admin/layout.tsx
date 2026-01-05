"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNav";
import { LOCATION_ADMIN } from "@/constants/routes";
import { useAuth } from "@/providers/AuthProvider";
import { useFirebase } from "@/providers/FirebaseProvider";
import { Avatar } from "@/ui-kit/avatar";
import { Button } from "@/ui-kit/button";
import {
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
} from "@/ui-kit/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarDivider,
} from "@/ui-kit/sidebar";
import { SidebarLayout } from "@/ui-kit/sidebar-layout";
import { Heading } from "@/ui-kit/heading";
import { Text } from "@/ui-kit/text";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import useLocations from "@/hooks/useLocations";
import { useFranchiseInquiries } from "@/hooks/useFranchiseInquiries";
import { useCareerInquiries } from "@/hooks/useCareerInquiries";
import { useLessonsInquiries } from "@/hooks/useLessonsInquiries";
import { useLeaguesInquiries } from "@/hooks/useLeaguesInquiries";
import { useFittingsInquiries } from "@/hooks/useFittingsInquiries";
import { useMembershipInquiries } from "@/hooks/useMembershipInquiries";
import { useEventsInquiries } from "@/hooks/useEventsInquiries";
import type Firebase from "@/lib/firebase/client";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_INQUIRY_READ_STATE_EVENT,
  ADMIN_INQUIRY_STORAGE_KEYS,
  type AdminInquiryKind,
} from "@/utils/adminReadState";

function readLastViewed(key: string) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = new Date(stored);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function readReadIds(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return new Set<string>();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Set<string>();
    const next = new Set<string>();
    parsed.forEach((id) => {
      if (typeof id === "string" && id) next.add(id);
    });
    return next;
  } catch {
    return new Set<string>();
  }
}

function computeUnreadCount<T>(
  inquiries: T[],
  lastViewedAt: Date | null,
  readIds: Set<string>,
  getRecordDate: (inquiry: T) => Date | null,
  getId: (inquiry: T) => string,
) {
  return inquiries.reduce((count, inquiry) => {
    const inquiryId = getId(inquiry);
    if (readIds.has(inquiryId)) return count;
    const recordDate = getRecordDate(inquiry);
    if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
    return count + 1;
  }, 0);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const condition = useMemo(
    () => (authUser: Record<string, unknown> | null) =>
      Boolean(authUser && (authUser as any)?.roles?.ADMIN),
    [],
  );

  return (
    <RequireAuth condition={condition}>
      <div className="dark bg-zinc-950 text-white">
        <AdminScaffold>{children}</AdminScaffold>
      </div>
    </RequireAuth>
  );
}

type AdminNavGroup = {
  label: string;
  items: Array<(typeof ADMIN_NAV_ITEMS)[number]>;
};

function AdminScaffold({ children }: { children: React.ReactNode }) {
  const firebase = useFirebase();
  const { authUser } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locations } = useLocations(firebase as Firebase);

  const displayName =
    ((authUser as any)?.displayName as string | undefined) ||
    ((authUser as any)?.name as string | undefined);
  const email = (authUser as any)?.email as string | undefined;
  const initials = (displayName || email || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const groupedNav = useMemo<AdminNavGroup[]>(() => {
    const groups: AdminNavGroup[] = [];

    ADMIN_NAV_ITEMS.forEach((item) => {
      const label = item.section ?? "General";
      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    });

    return groups;
  }, []);

  const viewParam = searchParams?.get("view");
  const tabParam = searchParams?.get("tab");
  const locationParam = searchParams?.get("locationId");
  const effectiveView = (viewParam === "business" || viewParam === "location") ? viewParam : "location";
  const effectiveTab =
    tabParam ??
    (effectiveView === "business" ? "settings" : "general");

  const activeHref =
    ADMIN_NAV_ITEMS.find(
      (item) => item.view === effectiveView && item.tab === effectiveTab,
    )?.href ??
    ADMIN_NAV_ITEMS.find((item) =>
      pathname.startsWith(item.href.split("?")[0]),
    )?.href ??
    null;

  const selectedLocationId =
    (locationParam && locations.find((location) => location.id === locationParam)?.id) ||
    locations[0]?.id ||
    "";

  const handleLocationChange = (nextId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("view", "location");
    params.set("tab", effectiveTab === "settings" ? "general" : effectiveTab);
    params.set("locationId", nextId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (effectiveView !== "location" || !selectedLocationId) {
      return;
    }
    if (locationParam === selectedLocationId) {
      return;
    }
    const params = new URLSearchParams(searchParams?.toString());
    params.set("view", "location");
    params.set("tab", params.get("tab") ?? "general");
    params.set("locationId", selectedLocationId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [
    effectiveView,
    locationParam,
    pathname,
    router,
    searchParams,
    selectedLocationId,
  ]);

  const handleSignOut = async () => {
    try {
      await firebase.doSignOut();
      router.replace("/");
    } catch (error) {
      console.error("[AdminLayout] sign out failed", error);
    }
  };

  return (
    <SidebarLayout
      navbar={
        <AdminNavbar
          displayName={displayName}
          email={email}
          initials={initials}
          onSignOut={handleSignOut}
        />
      }
      sidebar={({ closeSidebar }) => (
        <AdminSidebar
          firebase={firebase}
          groups={groupedNav}
          activeHref={activeHref}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onLocationChange={handleLocationChange}
          displayName={displayName}
          email={email}
          initials={initials}
          onSignOut={handleSignOut}
          onNavigate={closeSidebar}
        />
      )}
    >
      {children}
    </SidebarLayout>
  );
}

function AdminNavbar({
  displayName,
  email,
  initials,
  onSignOut,
}: {
  displayName?: string;
  email?: string;
  initials: string;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <Navbar className="bg-white/90 px-2 shadow-xs ring-1 ring-zinc-950/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10">
      <NavbarSection>
        <NavbarItem href={LOCATION_ADMIN}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold uppercase text-white dark:bg-white/10">
              B
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Bunker Admin</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Dashboard</p>
            </div>
          </div>
        </NavbarItem>
      </NavbarSection>

      <NavbarSpacer />

      <NavbarSection>
        <NavbarItem className="cursor-default">
          <Avatar
            initials={initials}
            alt={displayName || email || "Admin user"}
            className="size-9 text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {displayName || "Admin"}
            </p>
            {email ? <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{email}</p> : null}
          </div>
        </NavbarItem>
        <Button color="dark/zinc" onClick={onSignOut}>
          Sign out
        </Button>
      </NavbarSection>
    </Navbar>
  );
}

function AdminSidebar({
  firebase,
  groups,
  activeHref,
  locations,
  selectedLocationId,
  onLocationChange,
  displayName,
  email,
  initials,
  onSignOut,
  onNavigate,
}: {
  firebase: Firebase;
  groups: AdminNavGroup[];
  activeHref: string | null;
  locations: Array<{ id: string; name?: string }>;
  selectedLocationId?: string;
  onLocationChange?: (locationId: string) => void;
  displayName?: string;
  email?: string;
  initials: string;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
}) {
  const franchise = useFranchiseInquiries(firebase, {});
  const career = useCareerInquiries(firebase);
  const lesson = useLessonsInquiries(firebase);
  const league = useLeaguesInquiries(firebase);
  const fitting = useFittingsInquiries(firebase);
  const membership = useMembershipInquiries(firebase);
  const event = useEventsInquiries(firebase);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => {
      setVersion((value) => value + 1);
    };
    window.addEventListener(ADMIN_INQUIRY_READ_STATE_EVENT, handler as EventListener);
    window.addEventListener("storage", handler as EventListener);
    return () => {
      window.removeEventListener(ADMIN_INQUIRY_READ_STATE_EVENT, handler as EventListener);
      window.removeEventListener("storage", handler as EventListener);
    };
  }, []);

  const inquiryCounts = useMemo(() => {
    const computeCounts = <T,>(
      kind: AdminInquiryKind,
      inquiries: T[],
      getRecordDate: (inquiry: T) => Date | null,
      getId: (inquiry: T) => string,
    ) => {
      const storageKeys = ADMIN_INQUIRY_STORAGE_KEYS[kind];
      const lastViewedAt = readLastViewed(storageKeys.lastViewed);
      const readIds = readReadIds(storageKeys.readIds);
      return {
        total: inquiries.length,
        unread: computeUnreadCount(inquiries, lastViewedAt, readIds, getRecordDate, getId),
      };
    };

    return {
      franchise: computeCounts(
        "franchise",
        franchise.inquiries,
        (inquiry) => inquiry.submittedAtDate ?? inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      career: computeCounts(
        "career",
        career.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      lesson: computeCounts(
        "lesson",
        lesson.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      league: computeCounts(
        "league",
        league.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      fitting: computeCounts(
        "fitting",
        fitting.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      membership: computeCounts(
        "membership",
        membership.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
      event: computeCounts(
        "event",
        event.inquiries,
        (inquiry) => inquiry.createdAtDate ?? null,
        (inquiry) => inquiry.inquiryId,
      ),
    } satisfies Record<AdminInquiryKind, { total: number; unread: number }>;
  }, [
    franchise.inquiries,
    career.inquiries,
    lesson.inquiries,
    league.inquiries,
    fitting.inquiries,
    membership.inquiries,
    event.inquiries,
    version,
  ]);

  const inquiryTabMap: Record<string, AdminInquiryKind> = {
    "franchise-inquiries": "franchise",
    "career-inquiries": "career",
    "lesson-inquiries": "lesson",
    "league-inquiries": "league",
    "membership-inquiries": "membership",
    "fitting-inquiries": "fitting",
    "event-inquiries": "event",
  };

  return (
    <Sidebar className="h-full bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
      <SidebarHeader>
        <SidebarSection>
          <Heading level={3} className="text-lg font-semibold text-zinc-900 dark:text-white">
            Bunker Admin
          </Heading>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage locations, menus, and inquiries.
          </Text>
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody>
        {groups.map((group) => (
          <SidebarSection key={group.label}>
            <SidebarHeading>{group.label}</SidebarHeading>
            {group.label === "Locations" && locations.length ? (
              <div className="px-2 pb-2">
                <select
                  value={selectedLocationId}
                  onChange={(event) => onLocationChange?.(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs uppercase tracking-wide text-white/80 focus:border-primary focus:outline-none"
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id} className="text-black">
                      {location.name ?? "Location"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {group.items.map((item) => {
              const inquiryKind = inquiryTabMap[item.tab ?? ""];
              const counts = inquiryKind ? inquiryCounts[inquiryKind] : null;
              const total = counts?.total ?? 0;
              const unread = counts?.unread ?? 0;
              const showBadge = Boolean(inquiryKind);
              const badgeValue = unread > 0 ? unread : total;

              return (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  current={item.href === activeHref}
                  onClick={onNavigate}
                >
                  <SidebarLabel>{item.label}</SidebarLabel>
                  {showBadge ? (
                    <span
                      className={clsx(
                        "absolute right-2 top-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold shadow-lg shadow-black/20",
                        unread > 0
                          ? "bg-red-500 text-white"
                          : "bg-zinc-200 text-zinc-700 dark:bg-white/15 dark:text-white/70",
                      )}
                      title={`Total: ${total}${unread > 0 ? ` • Unread: ${unread}` : ""}`}
                      aria-label={`${badgeValue} ${unread > 0 ? "unread" : "total"} inquiries`}
                    >
                      {badgeValue}
                    </span>
                  ) : null}
                </SidebarItem>
              );
            })}
          </SidebarSection>
        ))}
      </SidebarBody>

      <SidebarDivider />

      <SidebarFooter>
        <SidebarSection>
          <SidebarItem className="cursor-default">
            <Avatar
              initials={initials}
              alt={displayName || email || "Admin user"}
              className="size-11 text-base"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {displayName || "Admin"}
              </p>
              {email ? <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{email}</p> : null}
            </div>
          </SidebarItem>
          <SidebarItem onClick={onSignOut} type="button">
            <SidebarLabel>Sign out</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  );
}
