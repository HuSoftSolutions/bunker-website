"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CareerInquiriesAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=business&tab=career-inquiries");
  }, [router]);

  return null;
}

