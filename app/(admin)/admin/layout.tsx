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
import type { LocationRecord } from "@/data/locationConfig";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminInquiryKind,
  type AdminInquiryReadState,
  DEFAULT_READ_STATE_MAP,
  resolveAdminInquiryReadStateMap,
} from "@/utils/adminReadState";
import {
  getManagerLocationIds,
  isAdmin,
  isAdminOrManager,
  isDisabled,
  isManager,
} from "@/utils/auth";
import { onSnapshot } from "firebase/firestore";

function computeUnreadCount<T>(
  inquiries: T[],
  readState: AdminInquiryReadState,
  getRecordDate: (inquiry: T) => Date | null,
  getId: (inquiry: T) => string,
) {
  const { lastViewedAt, readIds, unreadIds } = readState;
  return inquiries.reduce((count, inquiry) => {
    const inquiryId = getId(inquiry);
    if (unreadIds.has(inquiryId)) return count + 1;
    if (readIds.has(inquiryId)) return count;
    const recordDate = getRecordDate(inquiry);
    if (recordDate && lastViewedAt && recordDate <= lastViewedAt) return count;
    return count + 1;
  }, 0);
}

function readAuthString(
  authUser: Record<string, unknown> | null,
  key: string,
) {
  if (!authUser || typeof authUser !== "object") {
    return undefined;
  }
  const value = authUser[key];
  return typeof value === "string" ? value : undefined;
}

function resolveLocationId(location: LocationRecord | undefined) {
  const value = location?.id;
  return typeof value === "string" ? value : "";
}

function resolveLocationName(location: LocationRecord | undefined) {
  const value = location?.name;
  return typeof value === "string" && value.trim() ? value : "Location";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const hadLight = root.classList.contains("light");
    const previousScheme = root.style.colorScheme;

    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";

    return () => {
      if (!hadDark) {
        root.classList.remove("dark");
      }
      if (hadLight) {
        root.classList.add("light");
      }
      root.style.colorScheme = previousScheme;
    };
  }, []);

  const condition = useMemo(
    () =>
      (authUser: Record<string, unknown> | null) =>
        isAdminOrManager(authUser) && !isDisabled(authUser),
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
  const isAdminUser = isAdmin(authUser);
  const isManagerUser = isManager(authUser);
  const managerLocationIds = useMemo(
    () => getManagerLocationIds(authUser),
    [authUser],
  );
  const managerLocationTabs = useMemo(
    () => new Set(["calendar", "beverages", "sign-tvs"]),
    [],
  );

  const displayName = readAuthString(authUser, "displayName") ?? readAuthString(authUser, "name");
  const email = readAuthString(authUser, "email");
  const initials = (displayName || email || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems = useMemo(() => {
    if (isAdminUser) {
      return ADMIN_NAV_ITEMS;
    }

    if (isManagerUser) {
      return ADMIN_NAV_ITEMS.filter(
        (item) => item.view === "location" && managerLocationTabs.has(item.tab),
      );
    }

    return [];
  }, [isAdminUser, isManagerUser, managerLocationTabs]);

  const groupedNav = useMemo<AdminNavGroup[]>(() => {
    const groups: AdminNavGroup[] = [];

    navItems.forEach((item) => {
      const label = item.section ?? "General";
      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    });

    return groups;
  }, [navItems]);

  const viewParam = searchParams?.get("view");
  const tabParam = searchParams?.get("tab");
  const locationParam = searchParams?.get("locationId");
  const effectiveView = (viewParam === "business" || viewParam === "location") ? viewParam : "location";
  const effectiveTab = tabParam ?? (effectiveView === "business" ? "settings" : "general");

  const activeHref =
    navItems.find(
      (item) => item.view === "admin" && pathname.startsWith(item.href),
    )?.href ??
    navItems.find(
      (item) => item.view === effectiveView && item.tab === effectiveTab,
    )?.href ??
    navItems.find((item) =>
      pathname.startsWith(item.href.split("?")[0]),
    )?.href ??
    null;

  const scopedLocations = useMemo(() => {
    if (!isManagerUser || isAdminUser) {
      return locations;
    }

    if (!managerLocationIds.length) {
      return [];
    }

    return locations.filter((location) =>
      managerLocationIds.includes(resolveLocationId(location)),
    );
  }, [isAdminUser, isManagerUser, locations, managerLocationIds]);

  const selectedLocationId =
    (locationParam
      ? resolveLocationId(
          scopedLocations.find((location) => resolveLocationId(location) === locationParam),
        )
      : "") ||
    resolveLocationId(scopedLocations[0]) ||
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

  useEffect(() => {
    if (!isManagerUser || isAdminUser) {
      return;
    }

    if (!pathname.startsWith("/admin/locations")) {
      router.replace("/admin/locations?view=location&tab=calendar");
      return;
    }

    const params = new URLSearchParams(searchParams?.toString());
    let updated = false;

    if (params.get("view") !== "location") {
      params.set("view", "location");
      updated = true;
    }

    const currentTab = params.get("tab");
    if (!currentTab || !managerLocationTabs.has(currentTab)) {
      params.set("tab", "calendar");
      updated = true;
    }

    if (managerLocationIds.length) {
      const locationId = params.get("locationId");
      if (!locationId || !managerLocationIds.includes(locationId)) {
        params.set("locationId", managerLocationIds[0] ?? "");
        updated = true;
      }
    }

    if (updated) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [
    isAdminUser,
    isManagerUser,
    managerLocationIds,
    managerLocationTabs,
    pathname,
    router,
    searchParams,
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
          authUser={authUser}
          groups={groupedNav}
          activeHref={activeHref}
          locations={scopedLocations}
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
  authUser,
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
  authUser: Record<string, unknown> | null;
  groups: AdminNavGroup[];
  activeHref: string | null;
  locations: LocationRecord[];
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
  const [readStateMap, setReadStateMap] = useState(DEFAULT_READ_STATE_MAP);

  useEffect(() => {
    const userId = typeof authUser?.uid === "string" ? authUser.uid : null;
    if (!userId) {
      setReadStateMap(DEFAULT_READ_STATE_MAP);
      return;
    }
    const unsubscribe = onSnapshot(firebase.userRef(userId), (snapshot) => {
      setReadStateMap(
        resolveAdminInquiryReadStateMap(snapshot.data()?.adminInquiryState),
      );
    });
    return () => {
      unsubscribe();
    };
  }, [authUser?.uid, firebase]);

  const inquiryCounts = useMemo(() => {
    const computeCounts = <T,>(
      kind: AdminInquiryKind,
      inquiries: T[],
      getRecordDate: (inquiry: T) => Date | null,
      getId: (inquiry: T) => string,
    ) => {
      const readState = readStateMap[kind] ?? DEFAULT_READ_STATE_MAP[kind];
      return {
        total: inquiries.length,
        unread: computeUnreadCount(inquiries, readState, getRecordDate, getId),
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
    readStateMap,
    franchise.inquiries,
    career.inquiries,
    lesson.inquiries,
    league.inquiries,
    fitting.inquiries,
    membership.inquiries,
    event.inquiries,
  ]);

  const inquiryTabMap: Record<string, AdminInquiryKind> = {
    "franchise-inquiries": "franchise",
    "career-inquiries": "career",
    "lesson-inquiries": "lesson",
    "league-inquiries": "league",
    "membership-inquiries": "membership",
    "fitting-inquiries": "fitting",
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
                    <option
                      key={`${resolveLocationId(location) || location.name || "location"}`}
                      value={resolveLocationId(location)}
                      className="text-black"
                    >
                      {resolveLocationName(location)}
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
