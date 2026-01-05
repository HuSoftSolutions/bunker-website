"use client";

import { useEffect, useState } from "react";
import type Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData, type DocumentSnapshot } from "firebase/firestore";
import type { MembershipFormContent } from "@/data/membershipContent";

export type BusinessSettings = {
  teesheetUrl?: string | null;
  membershipRegistrationUrl?: string | null;
  membershipPaymentUrl?: string | null;
  membershipHeroImage?: {
    url: string;
    storagePath?: string | null;
  } | null;
  membershipForm?: MembershipFormContent | null;
};

const DEFAULT_SETTINGS: BusinessSettings = {
  teesheetUrl: null,
  membershipRegistrationUrl: null,
  membershipPaymentUrl: null,
  membershipHeroImage: null,
  membershipForm: null,
};

export default function useBusinessSettings(firebase: Firebase) {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = firebase
      .businessSettingsRef();

    const off = onSnapshot(
      unsubscribe,
      (snapshot: DocumentSnapshot<DocumentData>) => {
          const data = snapshot.exists() ? (snapshot.data() as BusinessSettings) : {};
          setSettings({ ...DEFAULT_SETTINGS, ...data });
          setLoading(false);
          setError(null);
        },
        (err: unknown) => {
          console.error("[useBusinessSettings] failed to load settings", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        },
    );

    return () => {
      off();
    };
  }, [firebase]);

  return {
    settings,
    loading,
    error,
  };
}
