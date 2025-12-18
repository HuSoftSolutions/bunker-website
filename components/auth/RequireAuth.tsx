"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import * as ROUTES from "@/constants/routes";

type RequireAuthProps = {
  children: React.ReactNode;
  condition: (authUser: Record<string, unknown> | null) => boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
};

export function RequireAuth({
  children,
  condition,
  redirectTo = ROUTES.SIGN_IN,
  fallback = null,
}: RequireAuthProps) {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  const isAllowed = condition(authUser);

  useEffect(() => {
    if (!loading && !isAllowed) {
      router.replace(redirectTo);
    }
  }, [isAllowed, loading, redirectTo, router]);

  if (!loading && !isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
