"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { useMemo } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const condition = useMemo(
    () => (authUser: Record<string, unknown> | null) =>
      Boolean(authUser && (authUser as any)?.roles?.ADMIN),
    [],
  );

  return (
    <RequireAuth condition={condition}>
      <div className="min-h-screen bg-zinc-950 text-white">
        {children}
      </div>
    </RequireAuth>
  );
}
