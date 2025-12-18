// Ensure this module is treated as client-only by Next.js.
"use client";

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  type Firestore,
  type DocumentData,
  onSnapshot,
  type Unsubscribe,
  type DocumentReference,
  type CollectionReference,
} from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

class Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;

  googleProvider: GoogleAuthProvider;
  facebookProvider: FacebookAuthProvider;
  twitterProvider: TwitterAuthProvider;

  constructor() {
    if (!getApps().length) {
      initializeApp(config);
    }

    this.app = getApp();
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.functions = getFunctions(this.app);
    this.storage = getStorage(this.app);

    this.googleProvider = new GoogleAuthProvider();
    this.facebookProvider = new FacebookAuthProvider();
    this.twitterProvider = new TwitterAuthProvider();
  }

  sendEmail = () => httpsCallable(this.functions, "sendEmail");

  doCreateUserWithEmailAndPassword = (email: string, password: string) =>
    createUserWithEmailAndPassword(this.auth, email, password);

  doSignInWithEmailAndPassword = (email: string, password: string) =>
    signInWithEmailAndPassword(this.auth, email, password);

  doSignInWithGoogle = () => signInWithPopup(this.auth, this.googleProvider);

  doSignInWithFacebook = () =>
    signInWithPopup(this.auth, this.facebookProvider);

  doSignInWithTwitter = () => signInWithPopup(this.auth, this.twitterProvider);

  doSignOut = () => signOut(this.auth);

  doPasswordReset = (email: string) => sendPasswordResetEmail(this.auth, email);

  doSendEmailVerification = () => {
    if (!this.auth.currentUser) {
      return undefined;
    }

    return sendEmailVerification(this.auth.currentUser, {
      url: process.env.NEXT_PUBLIC_CONFIRMATION_EMAIL_REDIRECT ?? "",
    });
  };

  doPasswordUpdate = (password: string) => {
    if (!this.auth.currentUser) {
      return undefined;
    }

    return updatePassword(this.auth.currentUser, password);
  };

  onAuthUserListener = (
    next: (authUser: Record<string, unknown>) => void,
    fallback: () => void,
  ): Unsubscribe =>
    onAuthStateChanged(this.auth, async (authUser) => {
      if (authUser) {
        const snapshot = await getDoc(this.userRef(authUser.uid));
        const dbUser = (snapshot.data() as Record<string, unknown>) ?? {};
        const roles = (dbUser as { roles?: unknown })?.roles ?? {};

        const mergedUser = {
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          providerData: authUser.providerData,
          roles,
          ...dbUser,
        };

        next(mergedUser);
        return;
      }

      try {
        await signInAnonymously(this.auth);
      } catch (error) {
        console.warn("[Firebase] signInAnonymously failed", error);
      }
      fallback();
    });

  userRef = (uid: string): DocumentReference<DocumentData> =>
    doc(this.db, `users/${uid}`);

  usersRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "users");

  messageRef = (uid: string): DocumentReference<DocumentData> =>
    doc(this.db, `messages/${uid}`);

  messagesRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "messages");

  beerRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `beer/${id}`);

  beersRef = (): CollectionReference<DocumentData> => collection(this.db, "beer");

  cannedBeerRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `cannedBeer/${id}`);

  cannedBeersRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "cannedBeer");

  specialRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `specials/${id}`);

  specialsRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "specials");

  winesRef = (): CollectionReference<DocumentData> => collection(this.db, "wine");

  wineRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `wine/${id}`);

  calendarEventsRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `calendarEvents/${id}`);

  calendarEventsAllRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "calendarEvents");

  locationRef = (id: string): DocumentReference<DocumentData> =>
    doc(this.db, `locations/${id}`);

  locationsRef = (): CollectionReference<DocumentData> =>
    collection(this.db, "locations");

  franchiseInquiriesRef = (franchiseSite = "franchise-website") =>
    collection(this.db, `franchise/${franchiseSite}/inquiries`);

  careerInquiriesRef = () =>
    collection(this.db, "inquiries/careers/submissions");

  lessonsInquiriesRef = () =>
    collection(this.db, "inquiries/lessons/submissions");

  leaguesInquiriesRef = () =>
    collection(this.db, "inquiries/leagues/submissions");

  adPageConfigRef = () => doc(this.db, "configs/ad_page");

  businessSettingsRef = () => doc(this.db, "configs/business");

  inquirySettingsRef = () => doc(this.db, "configs/inquiries");

  juniorGolfConfigRef = () => doc(this.db, "configs/junior_golf");

  fittingsConfigRef = () => doc(this.db, "configs/fittings");

  fittingsInquiriesRef = () =>
    collection(this.db, "inquiries/fittings/submissions");

  noticeInfoListener = (onUpdate: (data: DocumentData) => void): Unsubscribe =>
    onSnapshot(doc(this.db, "noticeInfo/config"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data) {
          onUpdate(data);
        }
      }
    });
}

export default Firebase;
