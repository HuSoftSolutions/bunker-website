"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useFirebase } from "@/providers/FirebaseProvider";

type AuthUser = Record<string, unknown> | null;

type AuthContextValue = {
  authUser: AuthUser;
  loading: boolean;
};

const AuthUserContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const firebase = useFirebase();
  const [authUser, setAuthUser] = useState<AuthUser>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage.getItem("authUser");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebase.onAuthUserListener(
      (user) => {
        window.localStorage.setItem("authUser", JSON.stringify(user));
        setAuthUser(user);
        setLoading(false);
      },
      () => {
        window.localStorage.removeItem("authUser");
        setAuthUser(null);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [firebase]);

  const value = useMemo(
    () => ({
      authUser,
      loading,
    }),
    [authUser, loading],
  );

  return (
    <AuthUserContext.Provider value={value}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
