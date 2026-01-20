"use client";

import { AdminShell } from "@/components/admin/AdminShell";
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
import { LeagueInquiriesPanel } from "@/components/admin/inquiries/LeagueInquiriesPanel";
import { MembershipInquiriesPanel } from "@/components/admin/inquiries/MembershipInquiriesPanel";
import { MembersPanel } from "@/components/admin/members/MembersPanel";
import { LocationMap } from "@/components/maps/LocationMap";
import { JuniorGolfSettingsPanel } from "@/components/admin/juniorGolf/JuniorGolfSettingsPanel";
import { FittingsSettingsPanel } from "@/components/admin/fittings/FittingsSettingsPanel";
import { LessonsSettingsPanel } from "@/components/admin/lessons/LessonsSettingsPanel";
import { BeverageMenusTab } from "@/components/admin/beverageMenus/BeverageMenusTab";
import { SignTvManager } from "@/components/admin/signTv/SignTvManager";
import {
	FALLBACK_LOCATIONS,
	FALLBACK_LOCATION_MAP,
} from "@/data/locationConfig";
import type { LocationRecord } from "@/data/locationConfig";
import { DEFAULT_MEMBERSHIP_CONTENT, type MembershipFormContent } from "@/data/membershipContent";
import useLocations, { mergeLocationRecord } from "@/hooks/useLocations";
import type Firebase from "@/lib/firebase/client";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  getAdminPageAccess,
  getManagerLocationIds,
  isAdmin,
  isManager,
} from "@/utils/auth";
import { Button } from "@/ui-kit/button";
import { Badge } from "@/ui-kit/badge";
import { Checkbox, CheckboxField } from "@/ui-kit/checkbox";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/ui-kit/dialog";
import { Description, Field, Label } from "@/ui-kit/fieldset";
import { Heading, Subheading } from "@/ui-kit/heading";
import { Input } from "@/ui-kit/input";
import { Switch, SwitchField } from "@/ui-kit/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui-kit/table";
import { Text, TextLink } from "@/ui-kit/text";
import { Textarea } from "@/ui-kit/textarea";
import clsx from "clsx";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

type AdminTab =
  | "general"
  | "menus"
  | "beverages"
  | "rates"
  | "ordering"
  | "map"
  | "calendar"
  | "sign-tvs"
  | "members";

type BusinessTab =
  | "settings"
  | "members"
  | "franchise-inquiries"
  | "career-inquiries"
  | "lesson-inquiries"
  | "league-inquiries"
  | "membership-inquiries"
  | "fitting-inquiries"
  | "fittings"
  | "lessons"
  | "junior-golf"
  | "inquiry-settings";

type LocationFormState = Record<string, unknown> | null;

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

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const resolveRecordValue = (value: unknown) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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
  membershipPaymentUrl?: string;
  membershipPaymentLinks?: Record<string, string> | null;
  membershipHeroImage?: MembershipHeroImage | null;
  membershipForm?: MembershipFormContent | null;
};

const BUSINESS_DEFAULT_STATE: BusinessSettingsFormState = {
  teesheetUrl: "",
  membershipRegistrationUrl: "",
  membershipPaymentUrl: "",
  membershipPaymentLinks: {},
  membershipHeroImage: null,
  membershipForm: { ...DEFAULT_MEMBERSHIP_CONTENT },
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
      membershipPaymentLinks:
        parsed?.membershipPaymentLinks && typeof parsed.membershipPaymentLinks === "object"
          ? { ...(parsed.membershipPaymentLinks as Record<string, string>) }
          : {},
      membershipForm: parsed?.membershipForm
        ? {
            ...DEFAULT_MEMBERSHIP_CONTENT,
            ...parsed.membershipForm,
          }
        : { ...DEFAULT_MEMBERSHIP_CONTENT },
    };
  } catch (error) {
    console.warn("[LocationsAdmin] failed to clone business state", error);
    return {
      ...BUSINESS_DEFAULT_STATE,
      ...value,
      membershipHeroImage: value?.membershipHeroImage
        ? { ...value.membershipHeroImage }
        : null,
      membershipPaymentLinks:
        value?.membershipPaymentLinks && typeof value.membershipPaymentLinks === "object"
          ? { ...(value.membershipPaymentLinks as Record<string, string>) }
          : {},
      membershipForm: value?.membershipForm
        ? {
            ...DEFAULT_MEMBERSHIP_CONTENT,
            ...value.membershipForm,
          }
        : { ...DEFAULT_MEMBERSHIP_CONTENT },
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

type NoticeBannerFormState = {
  showNoticeMsg: boolean;
  title: string;
  message: string;
  link: string;
  linkText: string;
};

type InfoModalFormState = {
  showInfoModal: boolean;
  showConfetti: boolean;
  alertMsg: string;
  title: string;
  msg: string;
  link: string;
  linkText: string;
  link2: string;
  linkText2: string;
};

type NoticeInfoFormState = {
  noticeMsg: NoticeBannerFormState;
  infoModal: InfoModalFormState;
};

type NoticeInfoAdminState = {
  form: NoticeInfoFormState;
  loading: boolean;
  saving: boolean;
  status: "idle" | "success" | "error";
  error: Error | null;
  setForm: Dispatch<SetStateAction<NoticeInfoFormState>>;
  save: () => Promise<void>;
  reset: () => void;
};

function sanitizeBusinessSettings(form: BusinessSettingsFormState | null) {
  const payload: Record<string, unknown> = {};

  const teesheetValue =
    typeof form?.teesheetUrl === "string" ? form.teesheetUrl.trim() : "";
  payload.teesheetUrl = teesheetValue || null;

  const paymentValue =
    typeof form?.membershipPaymentUrl === "string"
      ? form.membershipPaymentUrl.trim()
      : "";
  payload.membershipPaymentUrl = paymentValue || null;

  const heroUrl = form?.membershipHeroImage?.url?.trim();
  if (heroUrl) {
    payload.membershipHeroImage = {
      url: heroUrl,
      storagePath: form?.membershipHeroImage?.storagePath ?? null,
    };
  } else {
    payload.membershipHeroImage = null;
  }

  const sanitizeText = (value: unknown, fallback: string) =>
    typeof value === "string" ? value.trim() : fallback;
  const sanitizeList = (value: unknown, fallback: string[]) =>
    Array.isArray(value)
      ? value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean)
      : fallback;

  const rawMembershipForm = form?.membershipForm ?? DEFAULT_MEMBERSHIP_CONTENT;
  const membershipTypes = sanitizeList(
    rawMembershipForm.membershipTypes,
    [...DEFAULT_MEMBERSHIP_CONTENT.membershipTypes],
  );
  const rawPaymentLinks =
    form?.membershipPaymentLinks && typeof form.membershipPaymentLinks === "object"
      ? (form.membershipPaymentLinks as Record<string, unknown>)
      : null;
  if (rawPaymentLinks) {
    const cleanedLinks: Record<string, string> = {};
    membershipTypes.forEach((type) => {
      const candidate = rawPaymentLinks[type];
      if (typeof candidate === "string" && candidate.trim()) {
        cleanedLinks[type] = candidate.trim();
      }
    });
    payload.membershipPaymentLinks =
      Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null;
  } else {
    payload.membershipPaymentLinks = null;
  }
  payload.membershipForm = {
    formTitle: sanitizeText(rawMembershipForm.formTitle, DEFAULT_MEMBERSHIP_CONTENT.formTitle),
    formDescription: sanitizeText(
      rawMembershipForm.formDescription,
      DEFAULT_MEMBERSHIP_CONTENT.formDescription,
    ),
    agreementTitle: sanitizeText(
      rawMembershipForm.agreementTitle,
      DEFAULT_MEMBERSHIP_CONTENT.agreementTitle,
    ),
    paymentOptions: sanitizeList(
      rawMembershipForm.paymentOptions,
      [...DEFAULT_MEMBERSHIP_CONTENT.paymentOptions],
    ),
    perksTitle: sanitizeText(rawMembershipForm.perksTitle, DEFAULT_MEMBERSHIP_CONTENT.perksTitle),
    perks: sanitizeList(rawMembershipForm.perks, [...DEFAULT_MEMBERSHIP_CONTENT.perks]),
    detailsTitle: sanitizeText(rawMembershipForm.detailsTitle, DEFAULT_MEMBERSHIP_CONTENT.detailsTitle),
    details: sanitizeList(rawMembershipForm.details, [...DEFAULT_MEMBERSHIP_CONTENT.details]),
    membershipTypeLabel: sanitizeText(
      rawMembershipForm.membershipTypeLabel,
      DEFAULT_MEMBERSHIP_CONTENT.membershipTypeLabel,
    ),
    membershipTypes,
    successTitle: sanitizeText(
      rawMembershipForm.successTitle,
      DEFAULT_MEMBERSHIP_CONTENT.successTitle,
    ),
    successMessage: sanitizeText(
      rawMembershipForm.successMessage,
      DEFAULT_MEMBERSHIP_CONTENT.successMessage,
    ),
    paymentLinkLabel: sanitizeText(
      rawMembershipForm.paymentLinkLabel,
      DEFAULT_MEMBERSHIP_CONTENT.paymentLinkLabel,
    ),
    enrollmentTitle: sanitizeText(
      rawMembershipForm.enrollmentTitle,
      DEFAULT_MEMBERSHIP_CONTENT.enrollmentTitle,
    ),
    enrollmentSteps: sanitizeList(
      rawMembershipForm.enrollmentSteps,
      [...DEFAULT_MEMBERSHIP_CONTENT.enrollmentSteps],
    ),
  };

  return payload;
}

const NOTICE_INFO_DEFAULT_STATE: NoticeInfoFormState = {
  noticeMsg: {
    showNoticeMsg: false,
    title: "",
    message: "",
    link: "",
    linkText: "",
  },
  infoModal: {
    showInfoModal: false,
    showConfetti: false,
    alertMsg: "",
    title: "",
    msg: "",
    link: "",
    linkText: "",
    link2: "",
    linkText2: "",
  },
};

const cloneNoticeInfoState = (
  value: NoticeInfoFormState | null | undefined,
): NoticeInfoFormState => {
  if (!value) {
    return JSON.parse(JSON.stringify(NOTICE_INFO_DEFAULT_STATE)) as NoticeInfoFormState;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as NoticeInfoFormState;
  } catch (error) {
    console.warn("[NoticeInfoAdmin] failed to clone notice info state", error);
    return {
      noticeMsg: { ...NOTICE_INFO_DEFAULT_STATE.noticeMsg, ...(value.noticeMsg ?? {}) },
      infoModal: { ...NOTICE_INFO_DEFAULT_STATE.infoModal, ...(value.infoModal ?? {}) },
    };
  }
};

const normalizeNoticeMsg = (value: unknown): NoticeBannerFormState => {
  if (!value || typeof value !== "object") {
    return { ...NOTICE_INFO_DEFAULT_STATE.noticeMsg };
  }

  const raw = value as Record<string, unknown>;
  const message =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.msg === "string"
        ? raw.msg
        : "";

  return {
    showNoticeMsg: Boolean(raw.showNoticeMsg ?? raw.show ?? raw.enabled),
    title: typeof raw.title === "string" ? raw.title : "",
    message,
    link: typeof raw.link === "string" ? raw.link : "",
    linkText: typeof raw.linkText === "string" ? raw.linkText : "",
  };
};

const normalizeInfoModal = (value: unknown): InfoModalFormState => {
  if (!value || typeof value !== "object") {
    return { ...NOTICE_INFO_DEFAULT_STATE.infoModal };
  }

  const raw = value as Record<string, unknown>;
  const message =
    typeof raw.msg === "string"
      ? raw.msg
      : typeof raw.message === "string"
        ? raw.message
        : "";

  return {
    showInfoModal: Boolean(raw.showInfoModal ?? raw.show ?? raw.showModal ?? raw.enabled),
    showConfetti: raw.showConfetti === true,
    alertMsg: typeof raw.alertMsg === "string" ? raw.alertMsg : "",
    title: typeof raw.title === "string" ? raw.title : "",
    msg: message,
    link: typeof raw.link === "string" ? raw.link : "",
    linkText: typeof raw.linkText === "string" ? raw.linkText : "",
    link2: typeof raw.link2 === "string" ? raw.link2 : "",
    linkText2: typeof raw.linkText2 === "string" ? raw.linkText2 : "",
  };
};

function sanitizeNoticeInfo(form: NoticeInfoFormState | null) {
  const payload: Record<string, unknown> = {};
  const banner = form?.noticeMsg ?? NOTICE_INFO_DEFAULT_STATE.noticeMsg;
  const modal = form?.infoModal ?? NOTICE_INFO_DEFAULT_STATE.infoModal;

  payload.noticeMsg = {
    showNoticeMsg: Boolean(banner.showNoticeMsg),
    title: typeof banner.title === "string" ? banner.title.trim() : "",
    message: typeof banner.message === "string" ? banner.message.trim() : "",
    link: typeof banner.link === "string" ? banner.link.trim() : "",
    linkText: typeof banner.linkText === "string" ? banner.linkText.trim() : "",
  };

  payload.infoModal = {
    showInfoModal: Boolean(modal.showInfoModal),
    showConfetti: Boolean(modal.showConfetti),
    alertMsg: typeof modal.alertMsg === "string" ? modal.alertMsg.trim() : "",
    title: typeof modal.title === "string" ? modal.title.trim() : "",
    msg: typeof modal.msg === "string" ? modal.msg.trim() : "",
    link: typeof modal.link === "string" ? modal.link.trim() : "",
    linkText: typeof modal.linkText === "string" ? modal.linkText.trim() : "",
    link2: typeof modal.link2 === "string" ? modal.link2.trim() : "",
    linkText2: typeof modal.linkText2 === "string" ? modal.linkText2.trim() : "",
  };

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
          const membershipPaymentUrl =
            typeof data?.membershipPaymentUrl === "string"
              ? data.membershipPaymentUrl
              : "";
          const membershipPaymentLinks =
            data?.membershipPaymentLinks && typeof data.membershipPaymentLinks === "object"
              ? (data.membershipPaymentLinks as Record<string, string>)
              : {};
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
          const membershipFormData =
            data?.membershipForm && typeof data.membershipForm === "object"
              ? data.membershipForm
              : {};

          const nextState = cloneBusinessSettingsState({
            teesheetUrl,
            membershipRegistrationUrl,
            membershipPaymentUrl,
            membershipPaymentLinks,
            membershipHeroImage: heroImageData && heroImageData.url ? heroImageData : null,
            membershipForm: {
              ...DEFAULT_MEMBERSHIP_CONTENT,
              ...membershipFormData,
            },
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

function useNoticeInfoAdminState(firebase: Firebase): NoticeInfoAdminState {
  const [form, setForm] = useState<NoticeInfoFormState>(
    cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE),
  );
  const [initial, setInitial] = useState<NoticeInfoFormState>(
    cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE),
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
      firebase.noticeInfoRef(),
      (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : {};
          const nextState = cloneNoticeInfoState({
            noticeMsg: normalizeNoticeMsg(data?.noticeMsg),
            infoModal: normalizeInfoModal(data?.infoModal),
          });
          setForm(nextState);
          setInitial(nextState);
          setLoading(false);
        },
      (err: unknown) => {
          console.error("[NoticeInfoAdmin] failed to load notice info", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
    );

    return () => {
      unsubscribe?.();
    };
  }, [firebase]);

  const reset = useCallback(() => {
    setForm(cloneNoticeInfoState(initial));
    setStatus("idle");
    setError(null);
  }, [initial]);

  const save = useCallback(async () => {
    setSaving(true);
    setStatus("idle");
    setError(null);

    try {
      const payload = sanitizeNoticeInfo(form);
      await setDoc(firebase.noticeInfoRef(), payload, { merge: true });
      setInitial(cloneNoticeInfoState(form));
      setStatus("success");
    } catch (err) {
      console.error("[NoticeInfoAdmin] failed to save notice info", err);
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

  const rest = { ...form };
  delete rest.__meta;
  delete rest.id;
  delete rest.amenities;

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
  extras: Record<string, unknown>;
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

const toDateFromTimestampValue = (timestamp: unknown): Date | null => {
  if (!timestamp) {
    return null;
  }
  try {
    if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
      return timestamp;
    }
    if (
      typeof timestamp === "object" &&
      timestamp !== null &&
      "toDate" in timestamp &&
      typeof (timestamp as { toDate?: () => Date }).toDate === "function"
    ) {
      const date = (timestamp as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (
      typeof timestamp === "object" &&
      timestamp !== null &&
      "seconds" in timestamp &&
      typeof (timestamp as { seconds?: number }).seconds === "number"
    ) {
      return new Date((timestamp as { seconds: number }).seconds * 1000);
    }
  } catch {
    // ignore malformed values
  }
  return null;
};

const normalizeCalendarEvent = (event: Record<string, unknown>): CalendarFormEvent => {
  const extras: Record<string, unknown> = { ...event };
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

const sortCalendarEvents = (events: CalendarFormEvent[]) => {
  return events
    .map((event, index) => {
      const timestamp = buildTimestampFromForm(event.date, event.time);
      const sortValue = timestamp ? timestamp.getTime() : Number.POSITIVE_INFINITY;
      return { event, index, sortValue };
    })
    .sort((a, b) => {
      if (a.sortValue !== b.sortValue) {
        return a.sortValue - b.sortValue;
      }
      return a.index - b.index;
    })
    .map(({ event }) => event);
};

const serializeCalendarEvent = (event: CalendarFormEvent) => {
  const extras = { ...(event.extras || {}) };
  const payload: Record<string, unknown> = {
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
          const normalized = rawEvents.map((entry: Record<string, unknown>) =>
            normalizeCalendarEvent(entry),
          );
          const cloned = cloneCalendarEvents(sortCalendarEvents(normalized));
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
      const sorted = sortCalendarEvents(events);
      const serialized = sorted.map((event) => serializeCalendarEvent(event));
      await setDoc(
        firebase.calendarEventsRef(locationId),
        { calendarEvents: serialized },
        { merge: true },
      );
      setStatus("success");
      setEvents(cloneCalendarEvents(sorted));
      setInitial(cloneCalendarEvents(sorted));
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
  const { authUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locations, loading } = useLocations(firebase);
  const businessState = useBusinessSettingsAdminState(firebase);
  const noticeInfoState = useNoticeInfoAdminState(firebase);
  const isAdminUser = isAdmin(authUser);
  const isManagerUser = isManager(authUser);
  const adminPageAccess = useMemo(
    () => getAdminPageAccess(authUser),
    [authUser],
  );
  const adminAccessSet = useMemo(
    () => new Set(adminPageAccess),
    [adminPageAccess],
  );
  const managerLocationIds = useMemo(
    () => getManagerLocationIds(authUser),
    [authUser],
  );
  const managerLocationTabs = useMemo(() => {
    if (adminAccessSet.size === 0) {
      return new Set<AdminTab>(["calendar", "beverages", "sign-tvs"]);
    }
    const tabs = Array.from(adminAccessSet)
      .filter((entry) => entry.startsWith("location:"))
      .map((entry) => entry.split(":")[1])
      .filter(Boolean) as AdminTab[];
    return tabs.length
      ? new Set(tabs)
      : new Set<AdminTab>(["calendar", "beverages", "sign-tvs"]);
  }, [adminAccessSet]);
  const managerBusinessTabs = useMemo(() => {
    if (adminAccessSet.size === 0) {
      return new Set<BusinessTab>();
    }
    const tabs = Array.from(adminAccessSet)
      .filter((entry) => entry.startsWith("business:"))
      .map((entry) => entry.split(":")[1])
      .filter(Boolean) as BusinessTab[];
    return new Set(tabs);
  }, [adminAccessSet]);

  const [adminView, setAdminView] = useState<"business" | "location">("location");
  const [businessTab, setBusinessTab] = useState<BusinessTab>("settings");
  const [activeTab, setActiveTab] = useState<AdminTab>("general");
  const locationParam = searchParams?.get("locationId");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    () => {
      const fallbackId = FALLBACK_LOCATIONS[0]?.id;
      return locationParam ?? (typeof fallbackId === "string" ? fallbackId : "");
    },
  );

  const scopedLocations = useMemo(() => {
    if (!isManagerUser || isAdminUser) {
      return locations;
    }

    if (!managerLocationIds.length) {
      return [];
    }

    return locations.filter((location) =>
      managerLocationIds.includes(resolveStringValue(location.id)),
    );
  }, [isAdminUser, isManagerUser, locations, managerLocationIds]);

  useEffect(() => {
    const viewParam = searchParams?.get("view");
    const tabParam = searchParams?.get("tab");
    const locationIdParam = searchParams?.get("locationId");
    const isManagerRestricted = isManagerUser && !isAdminUser;
    const managerAllowsBusiness = managerBusinessTabs.size > 0;
    const resolvedView = isManagerRestricted
      ? viewParam === "business" && managerAllowsBusiness
        ? "business"
        : "location"
      : viewParam === "business"
        ? "business"
        : viewParam === "location"
          ? "location"
          : null;

    if (resolvedView === "business") {
      setAdminView("business");
    } else if (resolvedView === "location") {
      setAdminView("location");
    }

    const allowedTabs: BusinessTab[] = isManagerRestricted && adminAccessSet.size > 0
      ? (Array.from(managerBusinessTabs) as BusinessTab[])
      : [
          "settings",
          "members",
          "franchise-inquiries",
          "career-inquiries",
          "lesson-inquiries",
          "league-inquiries",
          "membership-inquiries",
          "fitting-inquiries",
          "fittings",
          "lessons",
          "junior-golf",
          "inquiry-settings",
        ];

    const allowedLocationTabs: AdminTab[] = isManagerRestricted
      ? (Array.from(managerLocationTabs) as AdminTab[])
      : [
          "general",
          "menus",
          "beverages",
          "rates",
          "calendar",
          "ordering",
          "map",
          "sign-tvs",
          "members",
        ];

    if (!tabParam) {
      if (isManagerRestricted) {
        setActiveTab((Array.from(managerLocationTabs)[0] ?? "calendar") as AdminTab);
      }
      return;
    }

    if ((resolvedView ?? adminView) === "business") {
      if (allowedTabs.includes(tabParam as BusinessTab)) {
        setBusinessTab(tabParam as BusinessTab);
      }
      return;
    }

    if (allowedLocationTabs.includes(tabParam as AdminTab)) {
      setActiveTab(tabParam as AdminTab);
    } else if (isManagerRestricted) {
      setActiveTab((Array.from(managerLocationTabs)[0] ?? "calendar") as AdminTab);
    }

    if (locationIdParam && locationIdParam !== selectedLocationId) {
      setSelectedLocationId(locationIdParam);
    }
  }, [
    adminView,
    adminAccessSet,
    isAdminUser,
    isManagerUser,
    managerBusinessTabs,
    managerLocationTabs,
    searchParams,
    selectedLocationId,
  ]);

  useEffect(() => {
    if (!selectedLocationId && scopedLocations.length) {
      const nextId = scopedLocations[0]?.id;
      if (typeof nextId === "string") {
        setSelectedLocationId(nextId);
      }
    }
  }, [scopedLocations, selectedLocationId]);

  useEffect(() => {
    if (!isManagerUser || isAdminUser) {
      return;
    }

    if (!managerLocationIds.length) {
      return;
    }

    const locationIdParam = searchParams?.get("locationId");
    if (!locationIdParam || !managerLocationIds.includes(locationIdParam)) {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("view", "location");
      params.set("tab", "calendar");
      params.set("locationId", managerLocationIds[0] ?? "");
      router.replace(`/admin/locations?${params.toString()}`);
    }
  }, [
    isAdminUser,
    isManagerUser,
    managerLocationIds,
    router,
    searchParams,
  ]);

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
    () =>
      scopedLocations.find((location) => location.id === selectedLocationId) ?? null,
    [scopedLocations, selectedLocationId],
  );

  const isLoading = loading || docLoading;

  const toastStatusRef = useRef({
    location: "idle",
    calendar: "idle",
    business: "idle",
  });

  useEffect(() => {
    const prev = toastStatusRef.current;
    if (adminView === "location" && status !== prev.location) {
      if (status === "success") {
        toast.success("Location changes saved successfully.");
      } else if (status === "error" && error) {
        toast.error(error.message);
      }
      prev.location = status;
    }

    if (adminView === "location" && calendarState.status !== prev.calendar) {
      if (calendarState.status === "success") {
        toast.success("Calendar updated successfully.");
      } else if (calendarState.status === "error" && calendarState.error) {
        toast.error(calendarState.error.message);
      }
      prev.calendar = calendarState.status;
    }

    if (adminView === "business" && businessState.status !== prev.business) {
      if (businessState.status === "success") {
        toast.success("Business settings saved successfully.");
      } else if (businessState.status === "error" && businessState.error) {
        toast.error(businessState.error.message);
      }
      prev.business = businessState.status;
    }
  }, [
    adminView,
    businessState.error,
    businessState.status,
    calendarState.error,
    calendarState.status,
    error,
    status,
  ]);

  const toolbarContent = null;

  return (
    <AdminShell
      title={adminView === "business" ? "Business" : "Locations"}
      toolbar={toolbarContent}
    >
      {adminView === "business" ? (
        <div className="space-y-4">
          {businessTab === "settings" ? (
            <BusinessSettingsPanel
              form={businessState.form}
              setForm={businessState.setForm}
              loading={businessState.loading}
              saving={businessState.saving}
              onSave={businessState.save}
              onReset={businessState.reset}
              firebase={firebase}
              noticeForm={noticeInfoState.form}
              setNoticeForm={noticeInfoState.setForm}
              noticeLoading={noticeInfoState.loading}
              noticeSaving={noticeInfoState.saving}
              onSaveNotice={noticeInfoState.save}
              onResetNotice={noticeInfoState.reset}
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

          {businessTab === "membership-inquiries" ? (
            <MembershipInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "members" ? (
            <MembersPanel
              firebase={firebase}
              locations={locations}
              scope="all"
            />
          ) : null}

          {businessTab === "fitting-inquiries" ? (
            <FittingInquiriesPanel firebase={firebase} />
          ) : null}

          {businessTab === "fittings" ? (
            <FittingsSettingsPanel firebase={firebase} />
          ) : null}

          {businessTab === "lessons" ? (
            <LessonsSettingsPanel firebase={firebase} />
          ) : null}

          {businessTab === "junior-golf" ? (
            <JuniorGolfSettingsPanel firebase={firebase} />
          ) : null}

          {businessTab === "inquiry-settings" ? (
            <InquirySettingsPanel firebase={firebase} />
          ) : null}
        </div>
      ) : !scopedLocations.length && isManagerUser && !isAdminUser ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 text-sm text-white/70 shadow-xl shadow-black/30">
          No locations are assigned to this manager yet. Ask an admin to update your access.
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-950 shadow-xl shadow-black/30">
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
                canManageTvs={isAdminUser}
                calendarState={calendarState}
                locations={scopedLocations}
                defaultLocationName={
                  typeof form?.name === "string"
                    ? form.name
                    : typeof selectedLocation?.name === "string"
                      ? selectedLocation.name
                      : ""
                }
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
  noticeForm: NoticeInfoFormState;
  setNoticeForm: Dispatch<SetStateAction<NoticeInfoFormState>>;
  noticeLoading: boolean;
  noticeSaving: boolean;
  onSaveNotice: () => Promise<void>;
  onResetNotice: () => void;
};

function BusinessSettingsPanel({
  form,
  setForm,
  loading,
  saving,
  onSave,
  onReset,
  firebase,
  noticeForm,
  setNoticeForm,
  noticeLoading,
  noticeSaving,
  onSaveNotice,
  onResetNotice,
}: BusinessSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"general" | "membership" | "notices">("general");
  const [heroUpload, setHeroUpload] = useState<{ status: "idle" | "uploading" | "success" | "error"; message?: string }>({
    status: "idle",
  });
  const heroInputId = useId();
  const membershipForm = form?.membershipForm ?? DEFAULT_MEMBERSHIP_CONTENT;
  const membershipPaymentLinks = form?.membershipPaymentLinks ?? {};

  const listToText = (value: string[]) => value.join("\n");
  const textToList = (value: string) =>
    value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const updateMembershipForm = useCallback(
    (field: keyof MembershipFormContent, value: string | string[]) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        membershipForm: {
          ...DEFAULT_MEMBERSHIP_CONTENT,
          ...(prev?.membershipForm ?? {}),
          [field]: value,
        },
      }));
    },
    [setForm],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        teesheetUrl: value,
      }));
    },
    [setForm],
  );

  const handlePaymentLinkChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        membershipPaymentUrl: value,
      }));
    },
    [setForm],
  );

  const handlePaymentLinkOverrideChange = useCallback(
    (membershipType: string, value: string) => {
      setForm((prev) => ({
        ...(prev ?? {}),
        membershipPaymentLinks: {
          ...(prev?.membershipPaymentLinks ?? {}),
          [membershipType]: value,
        },
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

  const bannerToggleId = useId();
  const modalToggleId = useId();
  const confettiToggleId = useId();

  const noticeBanner =
    noticeForm?.noticeMsg ?? cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE).noticeMsg;
  const infoModal =
    noticeForm?.infoModal ?? cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE).infoModal;

  const updateNotice = useCallback(
    (section: "noticeMsg" | "infoModal", field: string, value: unknown) => {
      setNoticeForm((prev) => ({
        ...(prev ?? cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE)),
        [section]: {
          ...(prev?.[section as keyof NoticeInfoFormState] ??
            cloneNoticeInfoState(NOTICE_INFO_DEFAULT_STATE)[section]),
          [field]: value,
        },
      }));
    },
    [setNoticeForm],
  );

  const tabSaving = activeTab === "notices" ? noticeSaving : saving;
  const tabLoading = activeTab === "notices" ? noticeLoading : loading;

  return (
    <div className="rounded-3xl border border-white/10   bg-zinc-950 shadow-xl shadow-black/30">
      <div className="border-b border-white/10 px-6 py-5">
        <Heading level={2} className="text-lg uppercase tracking-wide text-white">
          Business Settings
        </Heading>
        <Text className="mt-2 text-xs uppercase tracking-wide text-white/60">
          Configure defaults shared across all locations.
        </Text>
      </div>

      <div className="border-b border-white/10 px-6">
        <div className="flex flex-wrap gap-2 py-4">
          <Button
            plain
            onClick={() => setActiveTab("general")}
            className={clsx(
              "uppercase tracking-wide",
              activeTab === "general" ? "bg-white/10 text-white" : "text-white/60",
            )}
          >
            General
          </Button>
          <Button
            plain
            onClick={() => setActiveTab("membership")}
            className={clsx(
              "uppercase tracking-wide",
              activeTab === "membership" ? "bg-white/10 text-white" : "text-white/60",
            )}
          >
            Membership
          </Button>
          <Button
            plain
            onClick={() => setActiveTab("notices")}
            className={clsx(
              "uppercase tracking-wide",
              activeTab === "notices" ? "bg-white/10 text-white" : "text-white/60",
            )}
          >
            Notices
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            color="red"
            onClick={() => {
              void (activeTab === "notices" ? onSaveNotice() : onSave());
            }}
            disabled={tabSaving || tabLoading}
          >
            {tabSaving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            outline
            onClick={activeTab === "notices" ? onResetNotice : onReset}
            disabled={tabSaving || tabLoading}
          >
            Reset
          </Button>
        </div>

        {activeTab === "general" ? (
          <FormField
            label="Default teesheet link"
            hint="Shown when “Book Now” is used outside a specific location."
          >
            <Input
              id="business-teesheet-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://example.com/booking"
              value={form?.teesheetUrl ?? ""}
              onChange={(event) => handleInputChange(event.target.value)}
              disabled={loading}
            />
          </FormField>
        ) : null}

        {activeTab === "membership" ? (
          <div className="space-y-6">
            <FormField
              label="Membership payment link"
              hint="Shown after form submission so members can complete payment."
            >
              <Input
                id="business-membership-payment-link"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://example.com/checkout"
                value={form?.membershipPaymentUrl ?? ""}
                onChange={(event) => handlePaymentLinkChange(event.target.value)}
                disabled={loading}
              />
            </FormField>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Payment links by membership type
              </Subheading>
              <Text className="text-xs text-white/60">
                Optional overrides for each membership type. If empty, the default payment link is used.
              </Text>
              <div className="space-y-4">
                {membershipForm.membershipTypes.map((type) => (
                  <FormField key={type} label={type}>
                    <Input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://example.com/checkout"
                      value={membershipPaymentLinks[type] ?? ""}
                      onChange={(event) => handlePaymentLinkOverrideChange(type, event.target.value)}
                      disabled={loading}
                    />
                  </FormField>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Text className="text-xs uppercase tracking-wide text-white/60">
                  Membership hero image
                </Text>
                <Text className="text-xs text-white/60">
                  Upload a 16:9 image. If left blank, the site will use the default placeholder.
                </Text>
              </div>

              {form?.membershipHeroImage?.url ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <div className="relative aspect-[16/9] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.membershipHeroImage.url}
                      alt="Current membership hero"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <Text className="text-xs text-white/50">Preview</Text>
                    <Button outline onClick={handleHeroRemove}>
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/40">
                  <Text className="text-xs text-white/60">No image uploaded</Text>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  color="red"
                  onClick={() => {
                    const element = document.getElementById(heroInputId) as HTMLInputElement | null;
                    element?.click();
                  }}
                  disabled={loading}
                >
                  Upload Image
                </Button>
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
                  <Text className="text-xs uppercase tracking-wide text-white/60">Uploading...</Text>
                ) : null}
                {heroUpload.status === "success" ? (
                  <Text className="text-xs uppercase tracking-wide text-emerald-300">
                    {heroUpload.message || "Uploaded"}
                  </Text>
                ) : null}
                {heroUpload.status === "error" ? (
                  <Text className="text-xs uppercase tracking-wide text-rose-300">
                    {heroUpload.message || "Upload failed"}
                  </Text>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Form Copy
              </Subheading>
              <FormField label="Form title">
                <Input
                  type="text"
                  value={membershipForm.formTitle}
                  onChange={(event) => updateMembershipForm("formTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Form description">
                <Textarea
                  rows={3}
                  value={membershipForm.formDescription}
                  onChange={(event) => updateMembershipForm("formDescription", event.target.value)}
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Agreement Copy
              </Subheading>
              <FormField label="Agreement title">
                <Input
                  type="text"
                  value={membershipForm.agreementTitle}
                  onChange={(event) => updateMembershipForm("agreementTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Payment options" hint="One option per line.">
                <Textarea
                  rows={4}
                  value={listToText(membershipForm.paymentOptions)}
                  onChange={(event) =>
                    updateMembershipForm("paymentOptions", textToList(event.target.value))
                  }
                  disabled={loading}
                />
              </FormField>
              <FormField label="Perks title">
                <Input
                  type="text"
                  value={membershipForm.perksTitle}
                  onChange={(event) => updateMembershipForm("perksTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Perks list" hint="One perk per line.">
                <Textarea
                  rows={5}
                  value={listToText(membershipForm.perks)}
                  onChange={(event) =>
                    updateMembershipForm("perks", textToList(event.target.value))
                  }
                  disabled={loading}
                />
              </FormField>
              <FormField label="Details title">
                <Input
                  type="text"
                  value={membershipForm.detailsTitle}
                  onChange={(event) => updateMembershipForm("detailsTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Details list" hint="One detail per line.">
                <Textarea
                  rows={5}
                  value={listToText(membershipForm.details)}
                  onChange={(event) =>
                    updateMembershipForm("details", textToList(event.target.value))
                  }
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Membership Types
              </Subheading>
              <FormField label="Membership type label">
                <Input
                  type="text"
                  value={membershipForm.membershipTypeLabel}
                  onChange={(event) => updateMembershipForm("membershipTypeLabel", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Membership types" hint="One option per line.">
                <Textarea
                  rows={4}
                  value={listToText(membershipForm.membershipTypes)}
                  onChange={(event) =>
                    updateMembershipForm("membershipTypes", textToList(event.target.value))
                  }
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Enrollment Copy
              </Subheading>
              <FormField label="Enrollment title">
                <Input
                  type="text"
                  value={membershipForm.enrollmentTitle}
                  onChange={(event) => updateMembershipForm("enrollmentTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Enrollment steps" hint="One step per line.">
                <Textarea
                  rows={3}
                  value={listToText(membershipForm.enrollmentSteps)}
                  onChange={(event) =>
                    updateMembershipForm("enrollmentSteps", textToList(event.target.value))
                  }
                  disabled={loading}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                Confirmation Copy
              </Subheading>
              <FormField label="Success title">
                <Input
                  type="text"
                  value={membershipForm.successTitle}
                  onChange={(event) => updateMembershipForm("successTitle", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Success message">
                <Textarea
                  rows={3}
                  value={membershipForm.successMessage}
                  onChange={(event) => updateMembershipForm("successMessage", event.target.value)}
                  disabled={loading}
                />
              </FormField>
              <FormField label="Payment link label">
                <Input
                  type="text"
                  value={membershipForm.paymentLinkLabel}
                  onChange={(event) => updateMembershipForm("paymentLinkLabel", event.target.value)}
                  disabled={loading}
                />
              </FormField>
            </div>
          </div>
        ) : null}

        {activeTab === "notices" ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                  Notice Banner
                </Subheading>
                <SwitchField className="w-auto">
                  <Label htmlFor={bannerToggleId} className="text-xs uppercase tracking-wide text-white/70">
                    Display banner
                  </Label>
                  <Switch
                    id={bannerToggleId}
                    checked={noticeBanner.showNoticeMsg}
                    onChange={(value) =>
                      updateNotice("noticeMsg", "showNoticeMsg", value)
                    }
                    disabled={tabLoading}
                  />
                </SwitchField>
              </div>

              <FormGrid columns={2}>
                <FormField label="Title">
                  <Input
                    type="text"
                    value={noticeBanner.title}
                    onChange={(event) =>
                      updateNotice("noticeMsg", "title", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>

                <FormField label="Link label">
                  <Input
                    type="text"
                    value={noticeBanner.linkText}
                    onChange={(event) =>
                      updateNotice("noticeMsg", "linkText", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Message">
                <Textarea
                  value={noticeBanner.message}
                  onChange={(event) =>
                    updateNotice("noticeMsg", "message", event.target.value)
                  }
                  disabled={tabLoading}
                  rows={4}
                />
              </FormField>

              <FormField label="Link URL">
                <Input
                  type="url"
                  value={noticeBanner.link}
                  onChange={(event) =>
                    updateNotice("noticeMsg", "link", event.target.value)
                  }
                  disabled={tabLoading}
                />
              </FormField>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
                    Landing Page Modal
                  </Subheading>
                  <Text className="text-xs text-white/60">
                    Controls the popup shown on the public landing page.
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SwitchField className="w-auto">
                    <Label htmlFor={modalToggleId} className="text-xs uppercase tracking-wide text-white/70">
                      Show modal
                    </Label>
                    <Switch
                      id={modalToggleId}
                      checked={infoModal.showInfoModal}
                      onChange={(value) =>
                        updateNotice("infoModal", "showInfoModal", value)
                      }
                      disabled={tabLoading}
                    />
                  </SwitchField>
                  <SwitchField className="w-auto">
                    <Label htmlFor={confettiToggleId} className="text-xs uppercase tracking-wide text-white/70">
                      Show confetti
                    </Label>
                    <Switch
                      id={confettiToggleId}
                      checked={infoModal.showConfetti}
                      onChange={(value) =>
                        updateNotice("infoModal", "showConfetti", value)
                      }
                      disabled={tabLoading}
                    />
                  </SwitchField>
                </div>
              </div>

              <FormGrid columns={2}>
                <FormField label="Alert">
                  <Input
                    type="text"
                    value={infoModal.alertMsg}
                    onChange={(event) =>
                      updateNotice("infoModal", "alertMsg", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>

                <FormField label="Title">
                  <Input
                    type="text"
                    value={infoModal.title}
                    onChange={(event) =>
                      updateNotice("infoModal", "title", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Message">
                <Textarea
                  value={infoModal.msg}
                  onChange={(event) =>
                    updateNotice("infoModal", "msg", event.target.value)
                  }
                  disabled={tabLoading}
                  rows={5}
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField label="Primary link label">
                  <Input
                    type="text"
                    value={infoModal.linkText}
                    onChange={(event) =>
                      updateNotice("infoModal", "linkText", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
                <FormField label="Primary link URL">
                  <Input
                    type="url"
                    value={infoModal.link}
                    onChange={(event) =>
                      updateNotice("infoModal", "link", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
              </FormGrid>

              <FormGrid columns={2}>
                <FormField label="Secondary link label">
                  <Input
                    type="text"
                    value={infoModal.linkText2}
                    onChange={(event) =>
                      updateNotice("infoModal", "linkText2", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
                <FormField label="Secondary link URL">
                  <Input
                    type="url"
                    value={infoModal.link2}
                    onChange={(event) =>
                      updateNotice("infoModal", "link2", event.target.value)
                    }
                    disabled={tabLoading}
                  />
                </FormField>
              </FormGrid>
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
  canManageTvs,
  calendarState,
  locations,
  defaultLocationName,
}: {
  tab: AdminTab;
  form: Record<string, unknown>;
  setForm: Dispatch<SetStateAction<LocationFormState>>;
  saving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  firebase: Firebase;
  canManageTvs: boolean;
  calendarState: CalendarAdminState;
  locations: LocationRecord[];
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
  const isMembersTab = tab === "members";
  const isCalendarLoading = isCalendarTab ? calendarState.loading : false;
  const activeSaving = isCalendarTab ? calendarState.saving : saving;
  const handleSave = isCalendarTab ? calendarState.save : onSave;
  const handleReset = isCalendarTab ? calendarState.reset : onReset;

  return (
    <div className="space-y-6">
      {!isBeveragesTab && !isMembersTab ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            color="red"
            onClick={() => {
              void handleSave();
            }}
            disabled={activeSaving || isCalendarLoading}
          >
            {activeSaving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            outline
            onClick={handleReset}
            disabled={activeSaving}
          >
            Reset
          </Button>
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
          locationId={resolveStringValue(form.id)}
        />
      ) : null}

      {tab === "beverages" ? (
        <BeverageMenusTab
          firebase={firebase}
          locationId={resolveStringValue(form.id)}
          defaultLocationName={resolveStringValue(form.name, defaultLocationName ?? "")}
        />
      ) : null}

      {tab === "rates" ? (
        <RatesTab
          nonPeakRates={resolveRecordValue(form.nonPeakRates)}
          peakRates={resolveRecordValue(form.peakRates)}
          onChange={(field, value) => handleInputChange(field, value)}
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

      {tab === "map" ? (
        <MapTab
          coordinates={form.coordinates ?? { lat: "", lng: "" }}
          onChange={(coordinates) => handleInputChange("coordinates", coordinates)}
          locationName={resolveStringValue(form.name)}
        />
      ) : null}

      {tab === "sign-tvs" ? (
        <SignTvManager
          firebase={firebase}
          locationId={resolveStringValue(form.id)}
          locationName={resolveStringValue(form.name, defaultLocationName ?? "")}
          signTvs={Array.isArray(form.signTvs) ? form.signTvs : []}
          mode="location"
          canManageTvs={canManageTvs}
          canManageBusinessGraphics={false}
          canManageLocationGraphics
          onChangeSignTvs={(next) => handleInputChange("signTvs", next)}
        />
      ) : null}

      {tab === "members" ? (
        <MembersPanel
          firebase={firebase}
          locations={locations}
          scope="location"
          locationId={resolveStringValue(form.id)}
          locationName={resolveStringValue(form.name, defaultLocationName ?? "")}
        />
      ) : null}

    </div>
  );
}

type GeneralTabProps = {
  form: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
};

function GeneralTab({ form, onChange }: GeneralTabProps) {
  const newItemsToggleId = useId();
  const noticeToggleId = useId();

  const notice = useMemo(() => {
    const noticeRecord = resolveRecordValue(form.notice);

    return {
      showNoticeMsg: Boolean(noticeRecord?.showNoticeMsg),
      title: resolveStringValue(noticeRecord?.title),
      message: resolveStringValue(noticeRecord?.message),
      link: resolveStringValue(noticeRecord?.link),
      linkText: resolveStringValue(noticeRecord?.linkText),
    };
  }, [form.notice]);

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
          <Input
            type="text"
            value={resolveStringValue(form.name)}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </FormField>
        <FormField label="Phone">
          <Input
            type="text"
            value={resolveStringValue(form.phone)}
            onChange={(event) => onChange("phone", event.target.value)}
          />
        </FormField>
        <FormField label="Email">
          <Input
            type="email"
            value={resolveStringValue(form.email)}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </FormField>
        <FormField label="Booking URL">
          <Input
            type="text"
            value={resolveStringValue(form.url)}
            onChange={(event) => onChange("url", event.target.value)}
          />
        </FormField>
      </FormGrid>

      <FormField label="Address">
        <Textarea
          value={resolveStringValue(form.address)}
          onChange={(event) => onChange("address", event.target.value)}
          rows={4}
        />
      </FormField>

      <FormField label="Hours">
        <Input
          type="text"
          value={resolveStringValue(form.hoursFull)}
          onChange={(event) => onChange("hoursFull", event.target.value)}
        />
      </FormField>

      <SwitchField>
        <Label htmlFor={newItemsToggleId}>Highlight New Items</Label>
        <Description>
          Toggles the &quot;New Items&quot; badge for this location.
        </Description>
        <Switch
          id={newItemsToggleId}
          checked={Boolean(form.newItems)}
          onChange={(value) => onChange("newItems", value)}
        />
      </SwitchField>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
            Notice Banner
          </Subheading>
          <SwitchField className="w-auto">
            <Label htmlFor={noticeToggleId} className="text-xs uppercase tracking-wide text-white/70">
              Display banner
            </Label>
            <Switch
              id={noticeToggleId}
              checked={notice.showNoticeMsg}
              onChange={(value) => updateNotice("showNoticeMsg", value)}
            />
          </SwitchField>
        </div>
        <FormGrid columns={2}>
          <FormField label="Notice Title">
            <Input
              type="text"
              value={notice.title}
              onChange={(event) => updateNotice("title", event.target.value)}
            />
          </FormField>
          <FormField label="Notice Link Label">
            <Input
              type="text"
              value={notice.linkText}
              onChange={(event) => updateNotice("linkText", event.target.value)}
            />
          </FormField>
        </FormGrid>
        <FormField label="Notice Message">
          <Textarea
            value={notice.message}
            onChange={(event) => updateNotice("message", event.target.value)}
            rows={5}
          />
        </FormField>
        <FormField label="Notice Link URL">
          <Input
            type="text"
            value={notice.link}
            onChange={(event) => updateNotice("link", event.target.value)}
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
    <Field>
      <Label>{label}</Label>
      {children}
      {hint ? <Description>{hint}</Description> : null}
    </Field>
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<MenuEntry>({
    name: "",
    pdf: "",
    storagePath: "",
  });
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  const updateMenuAt = useCallback(
    (index: number, partial: Partial<MenuEntry>) => {
      const next = menus.map((menu, idx) =>
        idx === index ? { ...menu, ...partial } : menu,
      );
      onChange(next);
    },
    [menus, onChange],
  );

  const addMenu = () => {
    setDraft({ name: "", pdf: "", storagePath: "" });
    setEditingIndex(null);
    setUploadState({ status: "idle" });
    setModalOpen(true);
  };

  const removeMenu = (index: number) => {
    onChange(menus.filter((_, idx) => idx !== index));
  };

  const openEdit = (index: number) => {
    const menu = menus[index];
    if (!menu) {
      return;
    }
    setDraft({
      name: menu.name ?? "",
      pdf: menu.pdf ?? "",
      storagePath: menu.storagePath ?? "",
    });
    setEditingIndex(index);
    setUploadState({ status: "idle" });
    setModalOpen(true);
  };

  const handleDraftChange = (field: keyof MenuEntry, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const clearDraftFile = () => {
    setDraft((prev) => ({ ...prev, pdf: "", storagePath: "" }));
    setUploadState({ status: "idle" });
  };

  const uploadFileForDraft = async (file: File) => {
    setUploadState({ status: "uploading" });

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]+/g, "-");
    const timestamp = Date.now();
    const dir = locationId || "unknown";
    const storagePath = `menus/${dir}/${timestamp}-${safeName}`;

    try {
      const fileRef = storageRef(firebase.storage, storagePath);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      setDraft((prev) => ({
        ...prev,
        pdf: url,
        storagePath,
      }));

      setUploadState({ status: "success" });
    } catch (error) {
      console.error("[MenusTab] upload failed", error);
      setUploadState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSaveDraft = () => {
    if (editingIndex === null) {
      onChange([...menus, draft]);
    } else {
      updateMenuAt(editingIndex, draft);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button outline onClick={addMenu}>
          Add Menu
        </Button>
        <Text className="text-xs text-white/60">
          Upload PDF menus for this location. Updates write directly to Cloud Storage.
        </Text>
      </div>

      {menus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
          <Text className="text-sm text-white/70">
            No menus configured yet. Add a menu to get started.
          </Text>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <Table dense>
            <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
              <TableRow>
                <TableHeader>Menu</TableHeader>
                <TableHeader>PDF</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {menus.map((menu, index) => (
                <TableRow key={`menu-${index}`}>
                  <TableCell className="text-white">
                    {menu.name || `Menu ${index + 1}`}
                  </TableCell>
                  <TableCell className="text-white/70">
                    {menu.pdf ? (
                      <TextLink href={menu.pdf} target="_blank" rel="noopener noreferrer">
                        View PDF
                      </TextLink>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button outline onClick={() => openEdit(index)}>
                        Edit
                      </Button>
                      <Button color="red" onClick={() => removeMenu(index)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {modalOpen ? (
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
          <DialogTitle>{editingIndex === null ? "Add Menu" : "Edit Menu"}</DialogTitle>
          <DialogDescription>
            Update the menu details and upload a PDF.
          </DialogDescription>
          <DialogBody>
            <div className="space-y-4">
              <FormField label="Menu Name">
                <Input
                  type="text"
                  value={draft.name ?? ""}
                  onChange={(event) => handleDraftChange("name", event.target.value)}
                />
              </FormField>
              <FormField label="PDF URL" hint="Auto-filled after upload, but you can paste a link manually.">
                <Input
                  type="text"
                  value={draft.pdf ?? ""}
                  onChange={(event) => handleDraftChange("pdf", event.target.value)}
                />
              </FormField>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  color="red"
                  onClick={() => {
                    const element = document.getElementById("menu-upload-input") as HTMLInputElement | null;
                    element?.click();
                  }}
                >
                  Upload PDF
                </Button>
                <input
                  id="menu-upload-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadFileForDraft(file);
                    }
                    event.target.value = "";
                  }}
                />
                {draft.pdf ? (
                  <TextLink href={draft.pdf} target="_blank" rel="noopener noreferrer">
                    View PDF
                  </TextLink>
                ) : null}
                {draft.pdf ? (
                  <Button outline onClick={clearDraftFile}>
                    Clear File
                  </Button>
                ) : null}
              </div>
              {uploadState.status !== "idle" ? (
                <Text className="text-xs text-white/60">
                  {uploadState.status === "uploading"
                    ? "Uploading…"
                    : uploadState.status === "success"
                      ? "Uploaded"
                      : `Upload failed${uploadState.message ? `: ${uploadState.message}` : ""}`}
                </Text>
              ) : null}
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleSaveDraft}>
              Save Menu
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
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
      setEvents((prev) => sortCalendarEvents([...prev, normalized]));
    } else if (modalMode === "edit" && editingIndex !== null) {
      setEvents((prev) =>
        sortCalendarEvents(
          prev.map((event, idx) => (idx === editingIndex ? normalized : event)),
        ),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button outline onClick={openCreate} disabled={loading}>
          Add Event
        </Button>
        <Text className="text-xs text-white/60">
          Manage this location&apos;s calendar. Click an event row to edit it, or add a new one.
        </Text>
      </div>

      {loading ? (
        <Text className="text-sm text-white/60">Loading calendar events…</Text>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3">
          <Text className="text-sm text-rose-200">{error.message}</Text>
        </div>
      ) : null}

      {!loading && events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
          <Text className="text-sm text-white/70">
            No calendar events yet. Add an event to get started.
          </Text>
        </div>
      ) : null}

      {events.length ? (
        <>
        <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:block">
          <Table dense>
            <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
              <TableRow>
                <TableHeader>Title</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Time</TableHeader>
                <TableHeader>Feed</TableHeader>
                <TableHeader>Location</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event, index) => (
                <TableRow
                  key={event.id}
                  onClick={() => openEdit(index)}
                  className="cursor-pointer bg-black/20 transition hover:bg-white/5"
                >
                  <TableCell className="text-white">
                    {event.title || <span className="text-white/40">Untitled event</span>}
                  </TableCell>
                  <TableCell className="text-white/80">{event.date || "—"}</TableCell>
                  <TableCell className="text-white/80">{event.time || "—"}</TableCell>
                  <TableCell>
                    {event.showOnFeed ? (
                      <Badge color="emerald">Shown</Badge>
                    ) : (
                      <Badge color="zinc">Hidden</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {event.locationName || defaultLocationName || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <Text className="text-sm font-semibold text-white">
                  {event.title || "Untitled event"}
                </Text>
                <Text className="text-xs text-white/60">
                  {event.date || "—"} {event.time ? `• ${event.time}` : ""}
                </Text>
                <Text className="text-xs text-white/60">
                  {(event.locationName || defaultLocationName || "—") ?? "—"}
                </Text>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Text className="text-[0.7rem] uppercase tracking-wide text-white/60">
                  {event.showOnFeed ? "Shown on feed" : "Hidden from feed"}
                </Text>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : null}

      {modalOpen && draft ? (
        <Dialog open={modalOpen} onClose={closeModal}>
          <DialogTitle>
            {modalMode === "create" ? "Create Event" : "Edit Event"}
          </DialogTitle>
          <DialogDescription>
            Update the event details and save your changes.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Title">
                <Input
                  type="text"
                  value={draft.title}
                  onChange={(e) => handleDraftChange("title", e.target.value)}
                  placeholder="Event title"
                />
              </FormField>

              <FormField label="Date">
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) => handleDraftChange("date", e.target.value)}
                />
              </FormField>

              <FormField label="Time">
                <Input
                  type="time"
                  value={draft.time}
                  onChange={(e) => handleDraftChange("time", e.target.value)}
                />
              </FormField>

              <FormField label="Location Name">
                <Input
                  type="text"
                  value={draft.locationName}
                  onChange={(e) => handleDraftChange("locationName", e.target.value)}
                  placeholder="Displayed location name"
                />
              </FormField>

              <FormField label="Description">
                <Textarea
                  value={draft.description}
                  onChange={(e) => handleDraftChange("description", e.target.value)}
                  rows={5}
                  placeholder="Optional details"
                />
              </FormField>
            </div>

            <CheckboxField className="mt-4">
              <Checkbox
                checked={draft.showOnFeed}
                onChange={(value) => handleDraftChange("showOnFeed", value)}
              />
              <Label>Show on website feed</Label>
            </CheckboxField>
          </DialogBody>
          <DialogActions>
            {modalMode === "edit" ? (
              <Button color="red" onClick={handleDeleteDraft}>
                Delete Event
              </Button>
            ) : null}
            <Button outline onClick={closeModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleSaveDraft}>
              Save Event
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}

type RatesTabProps = {
  nonPeakRates: Record<string, unknown> | null | undefined;
  peakRates: Record<string, unknown> | null | undefined;
  onChange: (field: "nonPeakRates" | "peakRates", value: Record<string, unknown> | null) => void;
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
  value: Record<string, unknown> | null | undefined;
  onChange: (value: Record<string, unknown> | null) => void;
}) {
  const rates = value ?? { range: "", bays: [] };
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", price: "" });

  const updateRange = (next: string) => {
    onChange({ ...rates, range: next });
  };

  const addBay = () => {
    setDraft({ name: "", price: "" });
    setEditingIndex(null);
    setModalOpen(true);
  };

  const editBay = (index: number) => {
    const bays = Array.isArray(rates.bays) ? rates.bays : [];
    const current = bays[index];
    if (!current) {
      return;
    }
    setDraft({
      name: typeof current.name === "string" ? current.name : "",
      price: typeof current.price === "string" ? current.price : "",
    });
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleSaveDraft = () => {
    const bays = Array.isArray(rates.bays) ? [...rates.bays] : [];
    if (editingIndex === null) {
      bays.push({ ...draft });
    } else {
      bays[editingIndex] = { ...bays[editingIndex], ...draft };
    }
    onChange({ ...rates, bays });
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingIndex(null);
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
          <Subheading level={3} className="text-sm uppercase tracking-wide text-white">
            {title}
          </Subheading>
          <Text className="text-xs text-white/60">
            Update the hourly rate ranges and bay pricing.
          </Text>
        </div>
        <Button outline onClick={addBay}>
          Add Bay
        </Button>
      </div>

      <FormField label="Rate Range" hint="Displayed above the rate cards (e.g., Mon-Fri 9am-3pm).">
        <Input
          type="text"
          value={resolveStringValue(rates.range)}
          onChange={(event) => updateRange(event.target.value)}
        />
      </FormField>

      {(Array.isArray(rates.bays) ? rates.bays : []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
          <Text className="text-sm text-white/70">
            No bays configured yet. Add a bay to get started.
          </Text>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <Table dense>
            <TableHead className="bg-black/40 text-xs uppercase tracking-wide text-white/60">
              <TableRow>
                <TableHeader>Bay</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(rates.bays) ? rates.bays : []).map((bay: Record<string, string>, index: number) => (
                <TableRow key={`${title}-bay-${index}`}>
                  <TableCell className="text-white">{bay?.name ?? "—"}</TableCell>
                  <TableCell className="text-white/70">{bay?.price ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button outline onClick={() => editBay(index)}>
                        Edit
                      </Button>
                      <Button color="red" onClick={() => removeBay(index)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {modalOpen ? (
        <Dialog open={modalOpen} onClose={closeModal}>
          <DialogTitle>
            {editingIndex === null ? `Add ${title} Bay` : `Edit ${title} Bay`}
          </DialogTitle>
          <DialogDescription>
            Set the bay label and hourly rate.
          </DialogDescription>
          <DialogBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bay Name">
                <Input
                  type="text"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </FormField>
              <FormField label="Price">
                <Input
                  type="text"
                  value={draft.price}
                  onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
                />
              </FormField>
            </div>
          </DialogBody>
          <DialogActions>
            <Button outline onClick={closeModal}>
              Cancel
            </Button>
            <Button color="red" onClick={handleSaveDraft}>
              {editingIndex === null ? "Add Bay" : "Save Bay"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}

type OrderingLinksTabProps = {
  form: Record<string, unknown>;
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
          <Input
            type="text"
            value={resolveStringValue(form[field])}
            onChange={(event) => onChange(field, event.target.value)}
          />
        </FormField>
      ))}
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
          <Input
            type="text"
            value={lat}
            onChange={(event) => onChange({ ...coordinates, lat: event.target.value })}
          />
        </FormField>
        <FormField label="Longitude">
          <Input
            type="text"
            value={lng}
            onChange={(event) => onChange({ ...coordinates, lng: event.target.value })}
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
