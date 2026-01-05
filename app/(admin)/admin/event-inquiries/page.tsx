"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EventInquiriesAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=business&tab=event-inquiries");
  }, [router]);

  return null;
}
