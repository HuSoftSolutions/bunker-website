"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BeerAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/locations?view=location&tab=beverages");
  }, [router]);

  return null;
}

