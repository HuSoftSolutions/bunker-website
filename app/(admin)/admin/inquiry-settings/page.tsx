"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InquirySettingsAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=business&tab=inquiry-settings");
  }, [router]);

  return null;
}

