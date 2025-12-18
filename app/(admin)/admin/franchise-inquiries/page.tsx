"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FranchiseInquiriesAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=business&tab=franchise-inquiries");
  }, [router]);

  return null;
}

