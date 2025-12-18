"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNav";
import { LOCATION_ADMIN } from "@/constants/routes";
import {
  CareerInquiriesPanel,
} from "@/components/admin/inquiries/CareerInquiriesPanel";
import {
  FittingInquiriesPanel,
} from "@/components/admin/inquiries/FittingInquiriesPanel";
import {
  FranchiseInquiriesPanel,
} from "@/components/admin/inquiries/FranchiseInquiriesPanel";
import {
  InquirySettingsPanel,
} from "@/components/admin/inquiries/InquirySettingsPanel";
import {
  LessonInquiriesPanel,
} from "@/components/admin/inquiries/LessonInquiriesPanel";
import { InquiryUnreadBadge } from "@/components/admin/inquiries/InquiryUnreadBadge";
import { LeagueInquiriesPanel } from "@/components/admin/inquiries/LeagueInquiriesPanel";
import { LocationMap } from "@/components/maps/LocationMap";
import { JuniorGolfSettingsPanel } from "@/components/admin/juniorGolf/JuniorGolfSettingsPanel";
import { FittingsSettingsPanel } from "@/components/admin/fittings/FittingsSettingsPanel";
import { BeverageMenusTab } from "@/components/admin/beverageMenus/BeverageMenusTab";
import {
	FALLBACK_LOCATIONS,
	FALLBACK_LOCATION_MAP,
} from "@/data/locationConfig";
import useLocations, { mergeLocationRecord } from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";
import { useFirebase } from "@/providers/FirebaseProvider";
import clsx from "clsx";
import { format } from "date-fns";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";
import { onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

type AdminTab =
  | "general"
  | "menus"
  | "beverages"
  | "rates"
  | "promotions"
  | "ordering"
  | "career"
  | "images"
  | "map"
  | "about"
  | "calendar";

type BusinessTab =
  | "settings"
  | "franchise-inquiries"
  | "career-inquiries"
  | "lesson-inquiries"
  | "league-inquiries"
  | "fitting-inquiries"
  | "fittings"
  | "junior-golf"
  | "inquiry-settings";

const TAB_LABELS: Record<AdminTab, string> = {
  general: "General",
  menus: "Menus",
  beverages: "Beverage Menus",
  rates: "Rates",
  promotions: "Promotions",
  calendar: "Calendar",
  ordering: "Ordering Links",
  career: "Career Emails",
  images: "Images",
  map: "Map",
  about: "About",
};

type LocationFormState = Record<string, any> | null;

const cloneFormState = (value: LocationFormState): LocationFormState => {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as LocationFormState;
  } catch (error) {
    console.warn("[LocationsAdmin] failed to clone state", error);
    return value;
  }
};

type LocationAdminState = {
  form: LocationFormState;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  status: "idle" | "success" | "error";
  setForm: Dispatch<SetStateAction<LocationFormState>>;
  save: () => Promise<void>;
  reset: () => void;
};

type MembershipHeroImage = {
  url: string;
  storagePath?: string;
};

type BusinessSettingsFormState = {
  teesheetUrl?: string;
  membershipRegistrationUrl?: string;
  membershipHeroImage?: MembershipHeroImage | null;
};

const BUSINESS_DEFAULT_STATE: BusinessSettingsFormState = {
  teesheetUrl: "",
  membershipRegistrationUrl: "",
  membershipHeroImage: null,
};

const cloneBusinessSettingsState = (
  value: BusinessSettingsFormState | null | undefined,
): BusinessSettingsFormState => {
  if (!value) {
    return { ...BUSINESS_DEFAULT_STATE };
  }

  try {
    const parsed = JSON.parse(JSON.stringify(value)) as BusinessSettingsFormState;
    return {
      ...BUSINESS_DEFAULT_STATE,
      ...parsed,
      membershipHeroImage: parsed?.membershipHeroImage
        ? { ...parsed.membershipHeroImage }
        : null,
    };
  } catch (error) {
    console.warn("[LocationsAdmin] failed to clone business state", error);
    return {
      ...BUSINESS_DEFAULT_STATE,
      ...value,
      membershipHeroImage: value?.membershipHeroImage
        ? { ...value.membershipHeroImage }
        : null,
    };
  }
};

type BusinessAdminState = {
  form: BusinessSettingsFormState;
  loading: boolean;
  saving: boolean;
  status: "idle" | "success" | "error";
  error: Error | null;
  setForm: Dispatch<SetStateAction<BusinessSettingsFormState>>;
  save: () => Promise<void>;
  reset: () => void;
};

function sanitizeBusinessSettings(form: BusinessSettingsFormState | null) {
  const payload: Record<string, unknown> = {};

  const teesheetValue =
    typeof form?.teesheetUrl === "string" ? form.teesheetUrl.trim() : "";
  payload.teesheetUrl = teesheetValue || null;

  const registrationValue =
    typeof form?.membershipRegistrationUrl === "string"
      ? form.membershipRegistrationUrl.trim()
      : "";
  payload.membershipRegistrationUrl = registrationValue || null;

  const heroUrl = form?.membershipHeroImage?.url?.trim();
  if (heroUrl) {
    payload.membershipHeroImage = {
      url: heroUrl,
      storagePath: form?.membershipHeroImage?.storagePath ?? null,
    };
  } else {
    payload.membershipHeroImage = null;
  }

  return payload;
}

function useBusinessSettingsAdminState(firebase: Firebase): BusinessAdminState {
  const [form, setForm] = useState<BusinessSettingsFormState>(
    cloneBusinessSettingsState(BUSINESS_DEFAULT_STATE),
  );
  const [initial, setInitial] = useState<BusinessSettingsFormState>(
    cloneBusinessSettingsState(BUSINESS_DEFAULT_STATE),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setStatus("idle");
    setError(null);

    const unsubscribe = onSnapshot(
      firebase.businessSettingsRef(),
      (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : {};
          const teesheetUrl =
            typeof data?.teesheetUrl === "string" ? data.teesheetUrl : "";
          const membershipRegistrationUrl =
            typeof data?.membershipRegistrationUrl === "string"
              ? data.membershipRegistrationUrl
              : "";
          const heroImageData =
            data?.membershipHeroImage && typeof data.membershipHeroImage === "object"
              ? {
                  url: typeof data.membershipHeroImage.url === "string"
                    ? data.membershipHeroImage.url
                    : "",
                  storagePath:
                    typeof data.membershipHeroImage.storagePath === "string"
                      ? data.membershipHeroImage.storagePath
                      : undefined,
                }
              : null;

          const nextState = cloneBusinessSettingsState({
            teesheetUrl,
            membershipRegistrationUrl,
            membershipHeroImage: heroImageData && heroImageData.url ? heroImageData : null,
          });
          setForm(nextState);
          setInitial(nextState);
          setLoading(false);
        },
      (err: unknown) => {
          console.error("[LocationsAdmin] failed to load business settings", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
    );

    return () => {
      unsubscribe?.();
    };
  }, [firebase]);

  const reset = useCallback(() => {
    setForm(cloneBusinessSettingsState(initial));
    setStatus("idle");
    setError(null);
  }, [initial]);

  const save = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    setError(null);

    try {
      const payload = sanitizeBusinessSettings(form);
      await setDoc(firebase.businessSettingsRef(), payload, { merge: true });
      setInitial(cloneBusinessSettingsState(form));
      setStatus("success");
    } catch (err) {
      console.error("[LocationsAdmin] failed to save business settings", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [firebase, form]);

  return {
    form,
    loading,
    saving,
    status,
    error,
    setForm,
    save,
    reset,
  };
}

function sanitizeLocationPayload(form: LocationFormState) {
  if (!form) {
    return {};
  }

  const {
    id,
    amenities,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    __meta,
    ...rest
  } = form;

  const payload: Record<string, unknown> = {};

  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined) {
      payload[key] = value;
    }
  });

  return payload;
}

function useLocationAdminState(
  firebase: Firebase,
  locationId: string,
): LocationAdminState {
  const fallback = useMemo(
    () => FALLBACK_LOCATION_MAP[locationId] || {},
    [locationId],
  );

  const [form, setForm] = useState<LocationFormState>(null);
  const [initial, setInitial] = useState<LocationFormState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!locationId) {
      setForm(null);
      setInitial(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setStatus("idle");
    setError(null);
    const seeded = mergeLocationRecord(fallback, { id: locationId });
    setForm(cloneFormState(seeded));
    setInitial(cloneFormState(seeded));

    const unsubscribe = onSnapshot(
      firebase.locationRef(locationId),
      (snapshot) => {
          const remoteData = snapshot.exists() ? snapshot.data() : {};
          const merged = mergeLocationRecord(fallback, {
            ...remoteData,
            id: locationId,
          });

          setForm(cloneFormState(merged));
          setInitial(cloneFormState(merged));
          setLoading(false);
        },
      (err: unknown) => {
          console.error("[LocationsAdmin] failed to load", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
    );

    return () => {
      unsubscribe?.();
    };
  }, [firebase, fallback, locationId]);

  const reset = useCallback(() => {
    setForm(cloneFormState(initial));
    setStatus("idle");
    setError(null);
  }, [initial]);

  const save = useCallback(async () => {
    if (!form) {
      return;
    }

    setSaving(true);
    setStatus("idle");
    setError(null);

    try {
      const payload = sanitizeLocationPayload(form);
      await setDoc(firebase.locationRef(locationId), payload, { merge: true });
      setStatus("success");
      setInitial(cloneFormState(form));
    } catch (err) {
      console.error("[LocationsAdmin] failed to save", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [firebase, form, locationId]);

  return {
    form,
    loading,
    saving,
    error,
    status,
    setForm,
    save,
    reset,
  };
}

type CalendarFormEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  showOnFeed: boolean;
  locationName: string;
  extras: Record<string, any>;
};

type CalendarAdminState = {
  events: CalendarFormEvent[];
  setEvents: Dispatch<SetStateAction<CalendarFormEvent[]>>;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  status: "idle" | "success" | "error";
  save: () => Promise<void>;
  reset: () => void;
};

const generateEventId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const toDateFromTimestampValue = (timestamp: any): Date | null => {
  if (!timestamp) {
    return null;
  }
  try {
    if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
      return timestamp;
    }
    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof timestamp.seconds === "number") {
      return new Date(timestamp.seconds * 1000);
    }
  } catch {
    // ignore malformed values
  }
  return null;
};

const normalizeCalendarEvent = (event: Record<string, any>): CalendarFormEvent => {
  const extras: Record<string, any> = { ...event };
  const timestampDate = toDateFromTimestampValue(event?.timestamp);
  const normalizedEvent: CalendarFormEvent = {
    id:
      typeof event?.id === "string" && event.id.trim()
        ? event.id
        : generateEventId(),
    title: typeof event?.title === "string" ? event.title : "",
    description:
      typeof event?.description === "string" ? event.description : "",
    date:
      typeof event?.date === "string" && event.date.trim()
        ? event.date
        : timestampDate
        ? format(timestampDate, "yyyy-MM-dd")
        : "",
    time:
      typeof event?.time === "string" && event.time.trim()
        ? event.time
        : timestampDate
        ? format(timestampDate, "HH:mm")
        : "00:00",
    showOnFeed: Boolean(event?.showOnFeed),
    locationName:
      typeof event?.locationName === "string" ? event.locationName : "",
    extras: {},
  };

  [
    "id",
    "title",
    "description",
    "date",
    "time",
    "showOnFeed",
    "locationName",
    "timestamp",
  ].forEach((key) => {
    delete extras[key];
  });

  normalizedEvent.extras = extras;
  return normalizedEvent;
};

const cloneCalendarEvents = (events: CalendarFormEvent[]) =>
  events.map((event) => ({
    ...event,
    extras: { ...(event.extras || {}) },
  }));

const buildTimestampFromForm = (date: string, time: string) => {
  if (!date) {
    return null;
  }

  const safeTime =
    typeof time === "string" && /^\d{2}:\d{2}$/.test(time.trim())
      ? time.trim()
      : "00:00";
  const isoString = `${date}T${safeTime.length === 5 ? `${safeTime}:00` : safeTime}`;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const serializeCalendarEvent = (event: CalendarFormEvent) => {
  const extras = { ...(event.extras || {}) };
  const payload: Record<string, any> = {
    ...extras,
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    showOnFeed: event.showOnFeed,
    locationName: event.locationName,
  };

  const timestamp = buildTimestampFromForm(event.date, event.time);
  if (timestamp) {
    payload.timestamp = timestamp;
  } else if ("timestamp" in payload) {
    delete payload.timestamp;
  }

  return payload;
};

function useCalendarAdminState(
  firebase: Firebase,
  locationId: string | null,
): CalendarAdminState {
  const [events, setEvents] = useState<CalendarFormEvent[]>([]);
  const [initial, setInitial] = useState<CalendarFormEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!locationId) {
      setEvents([]);
      setInitial([]);
      setLoading(false);
      setStatus("idle");
      setError(null);
      return;
    }

    setLoading(true);
    setStatus("idle");
    setError(null);
    setEvents([]);
    setInitial([]);

    const unsubscribe = onSnapshot(
      firebase.calendarEventsRef(locationId),
      (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : {};
          const rawEvents = Array.isArray(data?.calendarEvents)
            ? data.calendarEvents
            : [];
          const normalized = rawEvents.map((entry: Record<string, any>) =>
            normalizeCalendarEvent(entry),
          );
          const cloned = cloneCalendarEvents(normalized);
          setEvents(cloned);
          setInitial(cloneCalendarEvents(cloned));
          setLoading(false);
        },
      (err: unknown) => {
          console.error("[CalendarAdmin] failed to load", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
    );

    return () => {
      unsubscribe?.();
    };
  }, [firebase, locationId]);

  const reset = useCallback(() => {
    setEvents(cloneCalendarEvents(initial));
    setStatus("idle");
    setError(null);
  }, [initial]);

  const save = useCallback(async () => {
    if (!locationId) {
      return;
    }

    setSaving(true);
    setStatus("idle");
    setError(null);

    try {
      const serialized = events.map((event) => serializeCalendarEvent(event));
      await setDoc(
        firebase.calendarEventsRef(locationId),
        { calendarEvents: serialized },
        { merge: true },
      );
      setStatus("success");
      setInitial(cloneCalendarEvents(events));
    } catch (err) {
      console.error("[CalendarAdmin] failed to save", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }, [events, firebase, locationId]);

  return {
    events,
    setEvents,
    loading,
    saving,
    error,
    status,
    save,
    reset,
  };
}

export default function LocationsAdminPage() {
  const firebase = useFirebase() as Firebase;
  const searchParams = useSearchParams();
  const { locations, loading } = useLocations(firebase);
  const businessState = useBusinessSettingsAdminState(firebase);

  const [adminView, setAdminView] = useState<"business" | "location">("location");
  const [businessTab, setBusinessTab] = useState<BusinessTab>("settings");
  const [activeTab, setActiveTab] = useState<AdminTab>("general");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => FALLBACK_LOCATIONS[0]?.id ?? "",
  );

  useEffect(() => {
    const viewParam = searchParams?.get("view");
    const tabParam = searchParams?.get("tab");

    const resolvedView =
      viewParam === "business"
        ? "business"
        : viewParam === "location"
          ? "location"
          : null;

    if (viewParam === "business") {
      setAdminView("business");
    } else if (viewParam === "location") {
      setAdminView("location");
    }

    const allowedTabs: BusinessTab[] = [
      "settings",
      "franchise-inquiries",
      "career-inquiries",
      "lesson-inquiries",
      "league-inquiries",
      "fitting-inquiries",
      "fittings",
      "junior-golf",
      "inquiry-settings",
    ];

    const allowedLocationTabs: AdminTab[] = [
      "general",
      "menus",
      "beverages",
      "rates",
      "promotions",
      "calendar",
      "ordering",
      "career",
      "images",
      "map",
      "about",
    ];

    if (!tabParam) return;

    if ((resolvedView ?? adminView) === "business") {
      if (allowedTabs.includes(tabParam as BusinessTab)) {
        setBusinessTab(tabParam as BusinessTab);
      }
      return;
    }

    if (allowedLocationTabs.includes(tabParam as AdminTab)) {
      setActiveTab(tabParam as AdminTab);
    }
  }, [searchParams, adminView]);

  useEffect(() => {
    if (!selectedLocationId && locations.length) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const {
    form,
    loading: docLoading,
    saving,
    error,
    status,
    setForm,
    save,
    reset,
  } = useLocationAdminState(firebase, selectedLocationId);
  const calendarState = useCalendarAdminState(
    firebase,
    selectedLocationId || null,
  );
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  const isLoading = loading || docLoading;

  const locationAlertContent = (
    <div className="space-y-3">
      {status === "success" ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
          Location changes saved successfully.
        </div>
      ) : null}
      {status === "error" && error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error.message}
        </div>
      ) : null}
      {calendarState.status === "success" ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
          Calendar updated successfully.
        </div>
      ) : null}
      {calendarState.status === "error" && calendarState.error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {calendarState.error.message}
        </div>
      ) : null}
    </div>
  );

  const businessAlertContent = (
    <div className="space-y-3">
      {businessState.status === "success" ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
          Business settings saved successfully.
        </div>
      ) : null}
      {businessState.status === "error" && businessState.error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {businessState.error.message}
        </div>
      ) : null}
    </div>
  );

  const toolbarContent = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-full border border-white/10 bg-black/60 p-1">
        <button
          type="button"
          onClick={() => setAdminView("business")}
          className={clsx(
            "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition",
            adminView === "business"
              ? "bg-primary text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          Business Settings
        </button>
        <button
          type="button"
          onClick={() => setAdminView("location")}
          className={clsx(
            "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide transition",
            adminView === "location"
              ? "bg-primary text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          Location Settings
        </button>
      </div>

      {adminView === "location" ? (
        <select
          value={selectedLocationId}
          onChange={(event) => setSelectedLocationId(event.target.value)}
          className="min-w-[220px] rounded-full border border-white/20 bg-black/60 px-4 py-2 text-sm uppercase tracking-wide text-white focus:border-primary focus:outline-none"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id} className="text-black">
              {location.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );

  return (
    <AdminShell
      title={adminView === "business" ? "Business" : "Locations"}
      description={
        adminView === "business"
          ? "Manage settings and inquiries shared across all locations."
          : "Manage location content, menus, calendar events, and metadata."
      }
      navItems={ADMIN_NAV_ITEMS}
      activeHref={LOCATION_ADMIN}
      toolbar={toolbarContent}
      alert={
        adminView === "business"
          ? businessTab === "settings"
            ? businessAlertContent
            : null
          : locationAlertContent
      }
    >
      {adminView === "business" ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-4 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Business Settings
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {([["settings", "Business Settings"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBusinessTab(key)}
                    className={clsx(
                      "relative w-full rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition",
                      businessTab === key
                        ? "bg-primary text-white"
                        : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-4 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Inquiries
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(
                  [
                    ["franchise-inquiries", "Franchise Inquiries"],
                    ["career-inquiries", "Career Inquiries"],
                    ["lesson-inquiries", "Lesson Inquiries"],
                    ["league-inquiries", "League Inquiries"],
                    ["fitting-inquiries", "Fitting Inquiries"],
                    ["inquiry-settings", "Inquiry Settings"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBusinessTab(key)}
                    className={clsx(
                      "relative w-full rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition",
                      businessTab === key
                        ? "bg-primary text-white"
                        : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
                    )}
                  >
                    {label}
                    {key === "franchise-inquiries" ? (
                      <InquiryUnreadBadge firebase={firebase} kind="franchise" />
                    ) : null}
                    {key === "career-inquiries" ? (
                      <InquiryUnreadBadge firebase={firebase} kind="career" />
                    ) : null}
                    {key === "lesson-inquiries" ? (
                      <InquiryUnreadBadge firebase={firebase} kind="lesson" />
                    ) : null}
                    {key === "league-inquiries" ? (
                      <InquiryUnreadBadge firebase={firebase} kind="league" />
                    ) : null}
                    {key === "fitting-inquiries" ? (
                      <InquiryUnreadBadge firebase={firebase} kind="fitting" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-4 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                Page Management
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(
                  [
                    ["fittings", "Fittings"],
                    ["junior-golf", "Junior Golf"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBusinessTab(key)}
                    className={clsx(
                      "relative w-full rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition",
                      businessTab === key
                        ? "bg-primary text-white"
                        : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {businessTab === "settings" ? (
            <BusinessSettingsPanel
              form={businessState.form}
              setForm={businessState.setForm}
              loading={businessState.loading}
              saving={businessState.saving}
              onSave={businessState.save}
              onReset={businessState.reset}
              firebase={firebase}
            />
          ) : null}

          {businessTab === "franchise-inquiries" ? (
            <FranchiseInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "career-inquiries" ? (
            <CareerInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "lesson-inquiries" ? (
            <LessonInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "league-inquiries" ? (
            <LeagueInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "fitting-inquiries" ? (
            <FittingInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "fittings" ? (
            <FittingsSettingsPanel firebase={firebase} />
          ) : null}

          {businessTab === "junior-golf" ? (
            <JuniorGolfSettingsPanel firebase={firebase} />
          ) : null}

          {businessTab === "inquiry-settings" ? (
            <InquirySettingsPanel firebase={firebase} />
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10   bg-zinc-950 shadow-xl shadow-black/30">
        <div className="border-b border-white/10 px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 py-4">
            {(Object.keys(TAB_LABELS) as AdminTab[]).map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={clsx(
                  "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                  activeTab === tabKey
                    ? "bg-primary text-white"
                    : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
                )}
              >
                {TAB_LABELS[tabKey]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <p className="text-sm text-white/60">Loading locations…</p>
          ) : form ? (
            <TabContent
              tab={activeTab}
              form={form}
              setForm={setForm}
              saving={saving}
              onSave={save}
              onReset={reset}
              firebase={firebase}
              calendarState={calendarState}
              defaultLocationName={form?.name ?? selectedLocation?.name ?? ""}
            />
          ) : (
            <p className="text-sm text-white/60">Select a location to begin editing.</p>
          )}
        </div>
      </div>
      )}
    </AdminShell>
  );
}

type BusinessSettingsPanelProps = {
  form: BusinessSettingsFormState;
  setForm: Dispatch<SetStateAction<BusinessSettingsFormState>>;
  loading: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  firebase: Firebase;
};

function BusinessSettingsPanel({
  form,
  setForm,
  loading,
  saving,
  onSave,
  onReset,
  firebase,
}: BusinessSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"general" | "membership">("general");
  const [heroUpload, setHeroUpload] = useState<{ status: "idle" | "uploading" | "success" | "error"; message?: string }>({
    status: "idle",
  });
  const heroInputId = useId();

  const handleInputChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        teesheetUrl: value,
      }));
    },
    [setForm],
  );

  const handleRegistrationChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        membershipRegistrationUrl: value,
      }));
    },
    [setForm],
  );

  const handleHeroUpload = useCallback(
    async (file: File) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, "-");
      const timestamp = Date.now();
      const storagePath = `membership/hero/${timestamp}-${safeName}`;

      setHeroUpload({ status: "uploading" });

      try {
        const fileRef = storageRef(firebase.storage, storagePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        setForm((prev) => ({
          ...(prev ?? {}),
          membershipHeroImage: {
            url,
            storagePath,
          },
        }));

        setHeroUpload({ status: "success", message: "Image uploaded" });
      } catch (error) {
        console.error("[BusinessSettings] hero upload failed", error);
        setHeroUpload({
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
    [firebase, setForm],
  );

  const handleHeroRemove = useCallback(() => {
    setForm((prev) => ({
      ...(prev ?? {}),
      membershipHeroImage: null,
    }));
    setHeroUpload({ status: "idle" });
  }, [setForm]);

  return (
    <div className="rounded-3xl border border-white/10   bg-zinc-950 shadow-xl shadow-black/30">
      <div className="border-b border-white/10 px-6 py-5">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
          Business Settings
        </h2>
        <p className="mt-2 text-xs uppercase tracking-wide text-white/50">
          Configure defaults shared across all locations.
        </p>
      </div>

      <div className="border-b border-white/10 px-6">
        <div className="flex flex-wrap gap-2 py-4">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
              activeTab === "general"
                ? "bg-primary text-white"
                : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
            )}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("membership")}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
              activeTab === "membership"
                ? "bg-primary text-white"
                : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-white",
            )}
          >
            Membership
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void onSave();
            }}
            disabled={saving || loading}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={saving || loading}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="space-y-2">
            <label
              htmlFor="business-teesheet-url"
              className="block text-xs font-semibold uppercase tracking-wide text-white/60"
            >
              Default teesheet link
            </label>
            <input
              id="business-teesheet-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://example.com/booking"
              value={form?.teesheetUrl ?? ""}
              onChange={(event) => handleInputChange(event.target.value)}
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-white/40"
            />
            <p className="text-xs text-white/40">
              Shown when “Book Now” is used outside a specific location.
            </p>
          </div>
        ) : null}

        {activeTab === "membership" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="business-membership-link"
                className="block text-xs font-semibold uppercase tracking-wide text-white/60"
              >
                Membership registration link
              </label>
              <input
                id="business-membership-link"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://forms.gle/your-form"
                value={form?.membershipRegistrationUrl ?? ""}
                onChange={(event) => handleRegistrationChange(event.target.value)}
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-0 disabled:cursor-not-allowed disabled:text-white/40"
              />
              <p className="text-xs text-white/40">
                Controls the “Sign Up Now” buttons on the public membership page.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Membership hero image
                </p>
                <p className="text-xs text-white/40">
                  Upload a 16:9 image. If left blank, the site will use the default placeholder.
                </p>
              </div>

              {form?.membershipHeroImage?.url ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <div className="relative aspect-[16/9] w-full">
                    <img
                      src={form.membershipHeroImage.url}
                      alt="Current membership hero"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-xs text-white/50">Preview</span>
                    <button
                      type="button"
                      onClick={handleHeroRemove}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40 text-xs text-white/40">
                  No image uploaded
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor={heroInputId}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
                >
                  Upload Image
                </label>
                <input
                  id={heroInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleHeroUpload(file);
                    }
                    event.target.value = "";
                  }}
                  disabled={loading}
                />

                {heroUpload.status === "uploading" ? (
                  <p className="text-xs uppercase tracking-wide text-white/60">Uploading...</p>
                ) : null}
                {heroUpload.status === "success" ? (
                  <p className="text-xs uppercase tracking-wide text-emerald-300">
                    {heroUpload.message || "Uploaded"}
                  </p>
                ) : null}
                {heroUpload.status === "error" ? (
                  <p className="text-xs uppercase tracking-wide text-rose-300">
                    {heroUpload.message || "Upload failed"}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabContent({
  tab,
  form,
  setForm,
  saving,
  onSave,
  onReset,
  firebase,
  calendarState,
  defaultLocationName,
}: {
  tab: AdminTab;
  form: Record<string, any>;
  setForm: Dispatch<SetStateAction<LocationFormState>>;
  saving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  firebase: Firebase;
  calendarState: CalendarAdminState;
  defaultLocationName: string;
}) {
  const handleInputChange = useCallback(
    (field: string, value: unknown) => {
      setForm((prev) => ({
        ...(prev || {}),
        [field]: value,
      }));
    },
    [setForm],
  );

  const isCalendarTab = tab === "calendar";
  const isBeveragesTab = tab === "beverages";
  const isCalendarLoading = isCalendarTab ? calendarState.loading : false;
  const activeSaving = isCalendarTab ? calendarState.saving : saving;
  const handleSave = isCalendarTab ? calendarState.save : onSave;
  const handleReset = isCalendarTab ? calendarState.reset : onReset;

  return (
    <div className="space-y-6">
      {!isBeveragesTab ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={activeSaving || isCalendarLoading}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {activeSaving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={activeSaving}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      ) : null}

      {tab === "general" ? (
        <GeneralTab form={form} onChange={handleInputChange} />
      ) : null}

      {tab === "menus" ? (
        <MenusTab
          menus={Array.isArray(form.menus) ? form.menus : []}
          onChange={(menus) => handleInputChange("menus", menus)}
          firebase={firebase}
          locationId={form.id}
        />
      ) : null}

      {tab === "beverages" ? (
        <BeverageMenusTab
          firebase={firebase}
          locationId={form.id}
          defaultLocationName={form.name ?? defaultLocationName ?? ""}
        />
      ) : null}

      {tab === "rates" ? (
        <RatesTab
          nonPeakRates={form.nonPeakRates}
          peakRates={form.peakRates}
          onChange={(field, value) => handleInputChange(field, value)}
        />
      ) : null}

      {tab === "promotions" ? (
        <PromotionsTab
          promotions={Array.isArray(form.promotions) ? form.promotions : []}
          onChange={(promotions) => handleInputChange("promotions", promotions)}
        />
      ) : null}

      {tab === "calendar" ? (
        <CalendarTab
          events={calendarState.events}
          setEvents={calendarState.setEvents}
          loading={calendarState.loading}
          error={calendarState.error}
          defaultLocationName={defaultLocationName}
        />
      ) : null}

      {tab === "ordering" ? (
        <OrderingLinksTab form={form} onChange={handleInputChange} />
      ) : null}

      {tab === "career" ? (
        <CareerEmailsTab
          emails={Array.isArray(form.careerEmails) ? form.careerEmails : []}
          onChange={(emails) => handleInputChange("careerEmails", emails)}
        />
      ) : null}

      {tab === "images" ? (
        <ImagesTab
          images={Array.isArray(form.images) ? form.images : []}
          onChange={(images) => handleInputChange("images", images)}
        />
      ) : null}

      {tab === "map" ? (
        <MapTab
          coordinates={form.coordinates ?? { lat: "", lng: "" }}
          onChange={(coordinates) => handleInputChange("coordinates", coordinates)}
          locationName={form.name}
        />
      ) : null}

      {tab === "about" ? (
        <AboutTab
          about={form.about ?? ""}
          onChange={(value) => handleInputChange("about", value)}
        />
      ) : null}
    </div>
  );
}

type GeneralTabProps = {
  form: Record<string, any>;
  onChange: (field: string, value: unknown) => void;
};

function GeneralTab({ form, onChange }: GeneralTabProps) {
  const newItemsToggleId = useId();
  const noticeToggleId = useId();

  const notice = useMemo(
    () => ({
      showNoticeMsg: Boolean(form.notice?.showNoticeMsg),
      title: form.notice?.title ?? "",
      message: form.notice?.message ?? "",
      link: form.notice?.link ?? "",
      linkText: form.notice?.linkText ?? "",
    }),
    [form.notice],
  );

  const updateNotice = useCallback(
    (field: keyof typeof notice, value: unknown) => {
      onChange("notice", {
        ...notice,
        [field]: value,
      });
    },
    [notice, onChange],
  );

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormField label="Location Name">
          <input
            type="text"
            value={form.name ?? ""}
            onChange={(event) => onChange("name", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Phone">
          <input
            type="text"
            value={form.phone ?? ""}
            onChange={(event) => onChange("phone", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(event) => onChange("email", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Booking URL">
          <input
            type="text"
            value={form.url ?? ""}
            onChange={(event) => onChange("url", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
      </FormGrid>

      <FormField label="Address">
        <textarea
          value={form.address ?? ""}
          onChange={(event) => onChange("address", event.target.value)}
          className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
        />
      </FormField>

      <FormField label="Hours">
        <input
          type="text"
          value={form.hoursFull ?? ""}
          onChange={(event) => onChange("hoursFull", event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
        />
      </FormField>

      <FormField
        label="Highlight New Items"
        hint="Toggles the 'New Items' badge for this location."
      >
        <div className="flex items-center gap-3">
          <input
            id={newItemsToggleId}
            type="checkbox"
            checked={Boolean(form.newItems)}
            onChange={(event) => onChange("newItems", event.target.checked)}
            className="h-5 w-5 rounded border border-white/20 bg-black/60 text-primary focus:ring-primary"
          />
          <label htmlFor={newItemsToggleId} className="text-sm text-white/70">
            Show "New Items" callout on the landing page.
          </label>
        </div>
      </FormField>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Notice Banner
          </h3>
          <div className="flex items-center gap-2">
            <input
              id={noticeToggleId}
              type="checkbox"
              checked={notice.showNoticeMsg}
              onChange={(event) => updateNotice("showNoticeMsg", event.target.checked)}
              className="h-5 w-5 rounded border border-white/20 bg-black/60 text-primary focus:ring-primary"
            />
            <label htmlFor={noticeToggleId} className="text-xs uppercase tracking-wide text-white/70">
              Display banner
            </label>
          </div>
        </div>
        <FormGrid columns={2}>
          <FormField label="Notice Title">
            <input
              type="text"
              value={notice.title}
              onChange={(event) => updateNotice("title", event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </FormField>
          <FormField label="Notice Link Label">
            <input
              type="text"
              value={notice.linkText}
              onChange={(event) => updateNotice("linkText", event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
            />
          </FormField>
        </FormGrid>
        <FormField label="Notice Message">
          <textarea
            value={notice.message}
            onChange={(event) => updateNotice("message", event.target.value)}
            className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Notice Link URL">
          <input
            type="text"
            value={notice.link}
            onChange={(event) => updateNotice("link", event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
      </div>
    </div>
  );
}

function FormGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx("grid grid-cols-1 gap-4", {
        "md:grid-cols-2": columns === 2,
        "md:grid-cols-3": columns === 3,
      })}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-semibold uppercase tracking-wide text-white/80">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-white/50">{hint}</span> : null}
    </label>
  );
}

type MenuEntry = {
  name?: string;
  pdf?: string;
  storagePath?: string;
  [key: string]: unknown;
};

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message?: string;
};

type MenusTabProps = {
  menus: MenuEntry[];
  onChange: (menus: MenuEntry[]) => void;
  firebase: Firebase;
  locationId?: string;
};

function MenusTab({ menus, onChange, firebase, locationId }: MenusTabProps) {
  const [uploadStates, setUploadStates] = useState<UploadState[]>(() =>
    menus.map(() => ({ status: "idle" })),
  );

  const ensureUploadStateLength = useCallback(
    (updater?: (draft: UploadState[]) => UploadState[]) => {
      setUploadStates((prev) => {
        const draft = updater ? updater([...prev]) : [...prev];
        while (draft.length < menus.length) {
          draft.push({ status: "idle" });
        }
        if (draft.length > menus.length) {
          draft.length = menus.length;
        }
        return draft;
      });
    },
    [menus.length],
  );

  useEffect(() => {
    ensureUploadStateLength();
  }, [ensureUploadStateLength, menus.length]);

  const updateMenuAt = useCallback(
    (index: number, partial: Partial<MenuEntry>) => {
      const next = menus.map((menu, idx) =>
        idx === index ? { ...menu, ...partial } : menu,
      );
      onChange(next);
    },
    [menus, onChange],
  );

  const handleNameChange = useCallback(
    (index: number, value: string) => {
      updateMenuAt(index, { name: value });
    },
    [updateMenuAt],
  );

  const addMenu = () => {
    onChange([
      ...menus,
      { name: "", pdf: "", storagePath: "" },
    ]);
    ensureUploadStateLength((draft) => {
      draft.push({ status: "idle" });
      return draft;
    });
  };

  const removeMenu = (index: number) => {
    onChange(menus.filter((_, idx) => idx !== index));
    ensureUploadStateLength((draft) => draft.filter((_, idx) => idx !== index));
  };

  const moveMenu = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= menus.length) {
      return;
    }

    const nextMenus = [...menus];
    const [item] = nextMenus.splice(index, 1);
    nextMenus.splice(targetIndex, 0, item);
    onChange(nextMenus);

    ensureUploadStateLength((draft) => {
      const nextStates = [...draft];
      const [state] = nextStates.splice(index, 1);
      nextStates.splice(targetIndex, 0, state);
      return nextStates;
    });
  };

  const clearFile = (index: number) => {
    updateMenuAt(index, { pdf: "", storagePath: "" });
    ensureUploadStateLength((draft) => {
      draft[index] = { status: "idle" };
      return draft;
    });
  };

  const uploadFile = async (index: number, file: File) => {
    ensureUploadStateLength((draft) => {
      draft[index] = { status: "uploading" };
      return draft;
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, "-");
    const timestamp = Date.now();
    const dir = locationId || "unknown";
    const storagePath = `menus/${dir}/${timestamp}-${safeName}`;

    try {
      const fileRef = storageRef(firebase.storage, storagePath);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      updateMenuAt(index, {
        pdf: url,
        storagePath,
      });

      ensureUploadStateLength((draft) => {
        draft[index] = { status: "success" };
        return draft;
      });
    } catch (error) {
      console.error("[MenusTab] upload failed", error);
      ensureUploadStateLength((draft) => {
        draft[index] = {
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        };
        return draft;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addMenu}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
        >
          Add Menu
        </button>
        <p className="text-xs text-white/50">
          Upload PDF menus for this location. Updates write directly to Cloud Storage.
        </p>
      </div>

      <div className="space-y-4">
        {menus.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
            No menus configured yet. Add a menu to get started.
          </p>
        ) : null}

        {menus.map((menu, index) => {
          const uploadState = uploadStates[index] ?? { status: "idle" };
          const fileInputId = `${locationId || "location"}-menu-${index}`;

          return (
            <div
              key={index}
              className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                  Menu {index + 1}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveMenu(index, -1)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
                    disabled={index === 0}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMenu(index, 1)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
                    disabled={index === menus.length - 1}
                  >
                    Move Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMenu(index)}
                    className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <FormGrid columns={2}>
                <FormField label="Menu Name">
                  <input
                    type="text"
                    value={menu.name ?? ""}
                    onChange={(event) => handleNameChange(index, event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </FormField>
                <FormField label="PDF URL" hint="Auto-filled after upload, but you can paste a link manually.">
                  <input
                    type="text"
                    value={menu.pdf ?? ""}
                    onChange={(event) => updateMenuAt(index, { pdf: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </FormField>
              </FormGrid>

              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor={fileInputId}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
                >
                  Upload PDF
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadFile(index, file);
                    }
                    event.target.value = "";
                  }}
                />

                {menu.pdf ? (
                  <a
                    href={menu.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-wide text-primary transition hover:text-primary/80"
                  >
                    View PDF
                  </a>
                ) : null}

                {menu.pdf ? (
                  <button
                    type="button"
                    onClick={() => clearFile(index)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10"
                  >
                    Clear File
                  </button>
                ) : null}
              </div>

              <UploadStatus status={uploadState.status} message={uploadState.message} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UploadStatus({
  status,
  message,
}: {
  status: UploadState["status"];
  message?: string;
}) {
  if (status === "idle") {
    return null;
  }

  const baseClass = "text-xs uppercase tracking-wide";

  if (status === "uploading") {
    return <p className={`${baseClass} text-white/60`}>Uploading…</p>;
  }

  if (status === "success") {
    return <p className={`${baseClass} text-emerald-300`}>Uploaded</p>;
  }

  return (
    <p className={`${baseClass} text-rose-300`}>
      Upload failed{message ? `: ${message}` : ""}
    </p>
  );
}

type CalendarTabProps = {
  events: CalendarFormEvent[];
  setEvents: Dispatch<SetStateAction<CalendarFormEvent[]>>;
  loading: boolean;
  error: Error | null;
  defaultLocationName: string;
};

function CalendarTab({
  events,
  setEvents,
  loading,
  error,
  defaultLocationName,
}: CalendarTabProps) {
  const createDefaultEvent = useCallback((): CalendarFormEvent => {
    const today = format(new Date(), "yyyy-MM-dd");
    return {
      id: generateEventId(),
      title: "",
      description: "",
      date: today,
      time: "00:00",
      showOnFeed: false,
      locationName: defaultLocationName,
      extras: {},
    };
  }, [defaultLocationName]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<CalendarFormEvent | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const openCreate = useCallback(() => {
    setDraft(createDefaultEvent());
    setModalMode("create");
    setEditingIndex(null);
    setModalOpen(true);
  }, [createDefaultEvent]);

  const openEdit = useCallback(
    (index: number) => {
      const existing = events[index];
      if (!existing) {
        return;
      }
      setDraft({
        ...existing,
        extras: { ...(existing.extras || {}) },
      });
      setModalMode("edit");
      setEditingIndex(index);
      setModalOpen(true);
    },
    [events],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDraft(null);
    setEditingIndex(null);
  }, []);

  const handleDraftChange = useCallback(
    (field: keyof CalendarFormEvent, value: unknown) => {
      setDraft((prev) =>
        prev
          ? ({
              ...prev,
              [field]: value,
            } as CalendarFormEvent)
          : prev,
      );
    },
    [],
  );

  const handleSaveDraft = useCallback(() => {
    if (!draft) {
      return;
    }

    const normalized = { ...draft, extras: { ...(draft.extras || {}) } };

    if (modalMode === "create") {
      setEvents((prev) => [...prev, normalized]);
    } else if (modalMode === "edit" && editingIndex !== null) {
      setEvents((prev) =>
        prev.map((event, idx) => (idx === editingIndex ? normalized : event)),
      );
    }
    closeModal();
  }, [draft, modalMode, editingIndex, setEvents, closeModal]);

  const handleDeleteDraft = useCallback(() => {
    if (modalMode === "edit" && editingIndex !== null) {
      setEvents((prev) => prev.filter((_, idx) => idx !== editingIndex));
      closeModal();
    }
  }, [modalMode, editingIndex, setEvents, closeModal]);

  const moveEvent = useCallback(
    (index: number, direction: -1 | 1) => {
      setEvents((prev) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= prev.length) {
          return prev;
        }
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.splice(targetIndex, 0, item);
        return next;
      });
    },
    [setEvents],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          disabled={loading}
        >
          Add Event
        </button>
        <p className="text-xs text-white/50">
          Manage this location&apos;s calendar. Click an event row to edit it, or add a new one.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-white/60">Loading calendar events…</p>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
          {error.message}
        </div>
      ) : null}

      {!loading && events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
          No calendar events yet. Add an event to get started.
        </p>
      ) : null}

      {events.length ? (
        <>
        <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:block">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Feed</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event, index) => (
                <tr
                  key={event.id}
                  onClick={() => openEdit(index)}
                  className="cursor-pointer bg-black/20 transition hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">
                    {event.title || <span className="text-white/40">Untitled event</span>}
                  </td>
                  <td className="px-4 py-3 text-white/80">{event.date || "—"}</td>
                  <td className="px-4 py-3 text-white/80">{event.time || "—"}</td>
                  <td className="px-4 py-3 text-white/80">
                    {event.showOnFeed ? (
                      <span className="rounded-full bg-primary/15 px-2 py-1 text-[0.65rem] font-semibold uppercase text-primary">
                        Shown
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/5 px-2 py-1 text-[0.65rem] uppercase text-white/50">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {event.locationName || defaultLocationName || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveEvent(index, -1);
                        }}
                        disabled={index === 0}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveEvent(index, 1);
                        }}
                        disabled={index === events.length - 1}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Down
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 md:hidden">
          {events.map((event, index) => (
            <div
              key={event.id}
              role="button"
              tabIndex={0}
              onClick={() => openEdit(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEdit(index);
                }
              }}
              className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left transition hover:border-primary/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white">
                  {event.title || "Untitled event"}
                </span>
                <span className="text-xs text-white/60">
                  {event.date || "—"} {event.time ? `• ${event.time}` : ""}
                </span>
                <span className="text-xs text-white/60">
                  {(event.locationName || defaultLocationName || "—") ?? "—"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[0.7rem] uppercase tracking-wide text-white/60">
                  {event.showOnFeed ? "Shown on feed" : "Hidden from feed"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveEvent(index, -1);
                    }}
                    disabled={index === 0}
                    className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveEvent(index, 1);
                    }}
                    disabled={index === events.length - 1}
                    className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Down
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : null}

      {modalOpen && draft ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                  {modalMode === "create" ? "Create Event" : "Edit Event"}
                </h3>
                <p className="text-xs text-white/60">
                  Update the event details and save your changes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Title
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => handleDraftChange("title", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Event title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Date
                </label>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => handleDraftChange("date", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Time
                </label>
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => handleDraftChange("time", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Location Name
                </label>
                <input
                  type="text"
                  value={draft.locationName}
                  onChange={(e) => handleDraftChange("locationName", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Displayed location name"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => handleDraftChange("description", e.target.value)}
                  className="h-28 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                  placeholder="Optional details"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
              <input
                type="checkbox"
                checked={draft.showOnFeed}
                onChange={(e) => handleDraftChange("showOnFeed", e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/60 text-primary focus:ring-primary"
              />
              Show on website feed
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {modalMode === "edit" ? (
                <button
                  type="button"
                  onClick={handleDeleteDraft}
                  className="rounded-full border border-rose-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
                >
                  Delete Event
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark"
                >
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type RatesTabProps = {
  nonPeakRates: Record<string, any> | null | undefined;
  peakRates: Record<string, any> | null | undefined;
  onChange: (field: "nonPeakRates" | "peakRates", value: Record<string, any> | null) => void;
};

function RatesTab({ nonPeakRates, peakRates, onChange }: RatesTabProps) {
  return (
    <div className="space-y-8">
      <RatesEditor
        title="Non-Peak Rates"
        value={nonPeakRates}
        onChange={(value) => onChange("nonPeakRates", value)}
      />
      <RatesEditor
        title="Peak Rates"
        value={peakRates}
        onChange={(value) => onChange("peakRates", value)}
      />
    </div>
  );
}

function RatesEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Record<string, any> | null | undefined;
  onChange: (value: Record<string, any> | null) => void;
}) {
  const rates = value ?? { range: "", bays: [] };

  const updateRange = (next: string) => {
    onChange({ ...rates, range: next });
  };

  const updateBay = (index: number, partial: Record<string, string>) => {
    const bays = Array.isArray(rates.bays) ? [...rates.bays] : [];
    bays[index] = { ...bays[index], ...partial };
    onChange({ ...rates, bays });
  };

  const addBay = () => {
    const bays = Array.isArray(rates.bays) ? [...rates.bays] : [];
    bays.push({ name: "", price: "" });
    onChange({ ...rates, bays });
  };

  const removeBay = (index: number) => {
    const bays = (Array.isArray(rates.bays) ? rates.bays : []).filter(
      (_: unknown, idx: number) => idx !== index,
    );
    onChange({ ...rates, bays });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            {title}
          </h3>
          <p className="text-xs text-white/50">
            Update the hourly rate ranges and bay pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={addBay}
          className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10"
        >
          Add Bay
        </button>
      </div>

      <FormField label="Rate Range" hint="Displayed above the rate cards (e.g., Mon-Fri 9am-3pm).">
        <input
          type="text"
          value={rates.range ?? ""}
          onChange={(event) => updateRange(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
        />
      </FormField>

      <div className="space-y-3">
        {(Array.isArray(rates.bays) ? rates.bays : []).map((bay: Record<string, string>, index: number) => (
          <div
            key={`${title}-bay-${index}`}
            className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto]"
          >
            <div className="space-y-3">
              <FormField label="Bay Name">
                <input
                  type="text"
                  value={bay?.name ?? ""}
                  onChange={(event) => updateBay(index, { name: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </FormField>
              <FormField label="Price">
                <input
                  type="text"
                  value={bay?.price ?? ""}
                  onChange={(event) => updateBay(index, { price: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
              </FormField>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                onClick={() => removeBay(index)}
                className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type PromotionsTabProps = {
  promotions: Array<Record<string, string>>;
  onChange: (promotions: Array<Record<string, string>>) => void;
};

function PromotionsTab({ promotions, onChange }: PromotionsTabProps) {
  const updatePromotion = (index: number, partial: Record<string, string>) => {
    const next = promotions.map((promotion, idx) =>
      idx === index ? { ...promotion, ...partial } : promotion,
    );
    onChange(next);
  };

  const addPromotion = () => {
    onChange([...promotions, { title: "", body: "" }]);
  };

  const removePromotion = (index: number) => {
    onChange(promotions.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addPromotion}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
      >
        Add Promotion
      </button>

      {promotions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-black/30 px-4 py-8 text-center text-sm text-white/60">
          No promotions yet. Use the button above to add one.
        </p>
      ) : null}

      <div className="space-y-4">
        {promotions.map((promotion, index) => (
          <div
            key={`promotion-${index}`}
            className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                Promotion {index + 1}
              </h3>
              <button
                type="button"
                onClick={() => removePromotion(index)}
                className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
              >
                Remove
              </button>
            </div>
            <FormField label="Title">
              <input
                type="text"
                value={promotion.title ?? ""}
                onChange={(event) => updatePromotion(index, { title: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
            </FormField>
            <FormField label="Body" hint="Supports plain text.">
              <textarea
                value={promotion.body ?? ""}
                onChange={(event) => updatePromotion(index, { body: event.target.value })}
                className="min-h-[100px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
            </FormField>
          </div>
        ))}
      </div>
    </div>
  );
}

type OrderingLinksTabProps = {
  form: Record<string, any>;
  onChange: (field: string, value: string) => void;
};

const ORDERING_FIELDS: Array<{ field: string; label: string; hint?: string }> = [
  { field: "mealeo", label: "Mealeo URL" },
  { field: "doordash", label: "DoorDash URL" },
  { field: "ubereats", label: "Uber Eats URL" },
  { field: "riverHouse", label: "River House URL" },
  { field: "grubhub", label: "Grubhub URL" },
  { field: "gloriaFoodUrl", label: "GloriaFood Embed URL", hint: "Used for inline ordering widgets." },
];

function OrderingLinksTab({ form, onChange }: OrderingLinksTabProps) {
  return (
    <div className="space-y-4">
      {ORDERING_FIELDS.map(({ field, label, hint }) => (
        <FormField key={field} label={label} hint={hint}>
          <input
            type="text"
            value={form[field] ?? ""}
            onChange={(event) => onChange(field, event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
      ))}
    </div>
  );
}

type CareerEmailsTabProps = {
  emails: string[];
  onChange: (emails: string[]) => void;
};

function CareerEmailsTab({ emails, onChange }: CareerEmailsTabProps) {
  const updateEmail = (index: number, value: string) => {
    const next = emails.map((email, idx) => (idx === index ? value : email));
    onChange(next);
  };

  const addEmail = () => {
    onChange([...emails, ""]);
  };

  const removeEmail = (index: number) => {
    onChange(emails.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addEmail}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
      >
        Add Email
      </button>

      <div className="space-y-3">
        {emails.length === 0 ? (
          <p className="text-sm text-white/50">No emails yet. Add at least one contact.</p>
        ) : null}

        {emails.map((email, index) => (
          <div key={`career-email-${index}`} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(event) => updateEmail(index, event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              placeholder="careers@getinthebunker.golf"
            />
            <button
              type="button"
              onClick={() => removeEmail(index)}
              className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type ImagesTabProps = {
  images: string[];
  onChange: (images: string[]) => void;
};

function ImagesTab({ images, onChange }: ImagesTabProps) {
  const updateImage = (index: number, value: string) => {
    const next = images.map((image, idx) => (idx === index ? value : image));
    onChange(next);
  };

  const addImage = () => {
    onChange([...images, ""]);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) {
      return;
    }
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addImage}
        className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
      >
        Add Image URL
      </button>

      <div className="space-y-3">
        {images.map((image, index) => (
          <div
            key={`image-${index}`}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 md:flex-row md:items-center"
          >
            <input
              type="text"
              value={image}
              onChange={(event) => updateImage(index, event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              placeholder="https://..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => moveImage(index, -1)}
                disabled={index === 0}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => moveImage(index, 1)}
                disabled={index === images.length - 1}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/10"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type MapTabProps = {
  coordinates: { lat?: number | string; lng?: number | string };
  onChange: (coords: { lat?: number | string; lng?: number | string }) => void;
  locationName?: string;
};

function MapTab({ coordinates, onChange, locationName }: MapTabProps) {
  const lat = coordinates?.lat ?? "";
  const lng = coordinates?.lng ?? "";

  return (
    <div className="space-y-6">
      <FormGrid columns={2}>
        <FormField label="Latitude">
          <input
            type="text"
            value={lat}
            onChange={(event) => onChange({ ...coordinates, lat: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Longitude">
          <input
            type="text"
            value={lng}
            onChange={(event) => onChange({ ...coordinates, lng: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
        </FormField>
      </FormGrid>

      <LocationMap
        lat={lat}
        lng={lng}
        label={locationName}
        heightClassName="h-72"
        className="w-full"
      />
    </div>
  );
}

type AboutTabProps = {
  about: string;
  onChange: (value: string) => void;
};

function AboutTab({ about, onChange }: AboutTabProps) {
  return (
    <FormField
      label="About Copy"
      hint="Displayed on the location page. Support plain text and simple formatting."
    >
      <textarea
        value={about}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[160px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
      />
    </FormField>
  );
}
