"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LessonInquiriesAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=business&tab=lesson-inquiries");
  }, [router]);

  return null;
}

