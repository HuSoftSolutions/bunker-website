// Ensure this module is treated as client-only by Next.js.
"use client";

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_SIGNTV_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_SIGNTV_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_SIGNTV_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_SIGNTV_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_SIGNTV_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_SIGNTV_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_SIGNTV_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_SIGNTV_MEASUREMENT_ID,
};

const SIGNTV_APP_NAME = "signTv";

class SignTvFirebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;

  constructor() {
    const existing = getApps().find((app) => app.name === SIGNTV_APP_NAME);
    if (!existing) {
      initializeApp(config, SIGNTV_APP_NAME);
    }

    this.app = getApp(SIGNTV_APP_NAME);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  ensureAnonAuth = async () => {
    if (!this.auth.currentUser) {
      await signInAnonymously(this.auth);
    }
  };
}

export default SignTvFirebase;
