"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type SignTvFirebase from "@/lib/firebase/signTvClient";

const SignTvFirebaseContext = createContext<SignTvFirebase | null>(null);

type SignTvFirebaseProviderProps = {
  children: React.ReactNode;
};

export function SignTvFirebaseProvider({
  children,
}: SignTvFirebaseProviderProps) {
  const [firebase, setFirebase] = useState<SignTvFirebase | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadFirebase = async () => {
      const { default: SignTvFirebaseClient } = await import(
        "@/lib/firebase/signTvClient"
      );
      const client = new SignTvFirebaseClient();
      try {
        await client.ensureAnonAuth();
      } catch (error) {
        console.warn("[SignTvFirebaseProvider] anonymous auth failed", error);
      }
      setFirebase(client);
      setReady(true);
    };

    loadFirebase();
  }, []);

  if (!firebase || !ready) {
    return null;
  }

  return (
    <SignTvFirebaseContext.Provider value={firebase}>
      {children}
    </SignTvFirebaseContext.Provider>
  );
}

export function useSignTvFirebase() {
  const firebase = useContext(SignTvFirebaseContext);
  if (!firebase) {
    throw new Error("useSignTvFirebase must be used within a SignTvFirebaseProvider");
  }
  return firebase;
}
