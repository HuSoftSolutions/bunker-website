"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/providers/FirebaseProvider";
import type Firebase from "@/lib/firebase/client";
import { Button } from "@/ui-kit/button";
import { Input } from "@/ui-kit/input";
import { Text } from "@/ui-kit/text";

type InvitePayload = {
  email: string;
  role: "ADMIN" | "MANAGER";
  managerLocationIds: string[];
  status?: string;
};

export default function SignUpPage() {
  const firebase = useFirebase() as Firebase;
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams?.get("invite");

  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadInvite = async () => {
      if (!inviteId) {
        setError("This invite link is missing.");
        setLoadingInvite(false);
        return;
      }

      try {
        const snapshot = await getDoc(firebase.userInviteRef(inviteId));
        if (!snapshot.exists()) {
          if (!active) return;
          setError("This invite link is no longer valid.");
          setLoadingInvite(false);
          return;
        }

        const data = snapshot.data();
        const payload: InvitePayload = {
          email: typeof data.email === "string" ? data.email : "",
          role: data.role === "ADMIN" ? "ADMIN" : "MANAGER",
          managerLocationIds: Array.isArray(data.managerLocationIds)
            ? data.managerLocationIds.filter(
                (entry: unknown): entry is string => typeof entry === "string",
              )
            : [],
          status: typeof data.status === "string" ? data.status : undefined,
        };

        if (!active) return;
        if (payload.status === "accepted") {
          setError("This invite has already been used.");
        } else {
          setInvite(payload);
        }
      } catch (err) {
        console.error("[SignUp] failed to load invite", err);
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Unable to load invite.",
        );
      } finally {
        if (active) {
          setLoadingInvite(false);
        }
      }
    };

    void loadInvite();
    return () => {
      active = false;
    };
  }, [firebase, inviteId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!invite) {
      setError("This invite is unavailable.");
      return;
    }

    if (!password.trim()) {
      setError("Choose a password.");
      return;
    }

    setSaving(true);

    try {
      const credential = await firebase.doCreateUserWithEmailAndPassword(
        invite.email,
        password,
      );

      const displayName = fullName.trim();
      await setDoc(
        firebase.userRef(credential.user.uid),
        {
          email: invite.email,
          displayName: displayName || null,
          roles: {
            ADMIN: invite.role === "ADMIN",
            MANAGER: invite.role === "MANAGER",
          },
          managerLocationIds:
            invite.role === "MANAGER" ? invite.managerLocationIds : [],
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      await updateDoc(firebase.userInviteRef(inviteId ?? ""), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
        acceptedBy: credential.user.uid,
      });

      router.replace("/admin/locations");
      return;
    } catch (err) {
      console.error("[SignUp] failed to create account", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create your account.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inviteSummary = useMemo(() => {
    if (!invite) return null;
    const roleLabel = invite.role === "ADMIN" ? "Admin" : "Manager";
    return `${roleLabel} account for ${invite.email}`;
  }, [invite]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-black px-4 text-white">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl shadow-black/40">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-primary/80">
            Invite
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[0.35em]">
            Sign Up
          </h1>
          <p className="text-sm text-white/70">
            {inviteSummary ?? "Create your admin account."}
          </p>
        </div>

        {loadingInvite ? (
          <Text className="text-sm text-white/60">Loading invite…</Text>
        ) : error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs uppercase tracking-wide text-rose-300">
            {error}
          </p>
        ) : invite ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm uppercase tracking-wide text-white/70">
              Full name
              <Input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm uppercase tracking-wide text-white/70">
              Email
              <Input type="email" value={invite.email} disabled />
            </label>
            <label className="flex flex-col gap-2 text-sm uppercase tracking-wide text-white/70">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
              />
            </label>

            <Button
              color="emerald"
              type="submit"
              disabled={saving}
              className="w-full justify-center"
            >
              {saving ? "Creating…" : "Create account"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
