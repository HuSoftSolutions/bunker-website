"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type Firebase from "@/lib/firebase/client";

const FirebaseContext = createContext<Firebase | null>(null);

type FirebaseProviderProps = {
  children: React.ReactNode;
};

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [firebase, setFirebase] = useState<Firebase | null>(null);

  useEffect(() => {
    let active = true;

    const loadFirebase = async () => {
      const { default: FirebaseClient } = await import("@/lib/firebase/client");
      if (active) {
        setFirebase(new FirebaseClient());
      }
    };

    loadFirebase();

    return () => {
      active = false;
    };
  }, []);

  if (!firebase) {
    return null;
  }

  return (
    <FirebaseContext.Provider value={firebase}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const firebase = useContext(FirebaseContext);
  if (!firebase) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return firebase;
}
