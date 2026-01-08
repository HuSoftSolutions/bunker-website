"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useAuth } from "@/providers/AuthProvider";
import { isAdminOrManager, isDisabled } from "@/utils/auth";

export default function SignInPage() {
  const firebase = useFirebase();
  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/admin/locations";
  const isAllowed = isAdminOrManager(authUser) && !isDisabled(authUser);

  useEffect(() => {
    if (!authLoading && isAllowed) {
      router.replace(redirectTo);
    }
  }, [authLoading, isAllowed, redirectTo, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await firebase.doSignInWithEmailAndPassword(email.trim(), password);
      router.replace(redirectTo);
    } catch (err) {
      console.error("[SignIn] failed", err);
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetStatus("sending");
    setResetMessage(null);

    try {
      const targetEmail = resetEmail.trim() || email.trim();
      if (!targetEmail) {
        setResetStatus("error");
        setResetMessage("Enter your email to reset your password.");
        return;
      }
      await firebase.doPasswordReset(targetEmail);
      setResetStatus("sent");
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("[SignIn] password reset failed", err);
      setResetStatus("error");
      setResetMessage(
        err instanceof Error ? err.message : "Unable to send reset email.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-black px-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-black/60 p-8 shadow-2xl shadow-black/40">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-primary/80">Admin</p>
          <h1 className="text-3xl font-black uppercase tracking-[0.35em]">
            Sign In
          </h1>
          <p className="text-sm text-white/70">
            Enter your admin or manager credentials to access The Bunker control room.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm uppercase tracking-wide text-white/70">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
              placeholder="admin@getinthebunker.golf"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm uppercase tracking-wide text-white/70">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs uppercase tracking-wide text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/40"
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>

        <form onSubmit={handlePasswordReset} className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Forgot your password?
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none"
              placeholder="Email address"
            />
            <button
              type="submit"
              disabled={resetStatus === "sending"}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetStatus === "sending" ? "Sending…" : "Send reset email"}
            </button>
          </div>
          {resetMessage ? (
            <p
              className={
                resetStatus === "error"
                  ? "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs uppercase tracking-wide text-rose-300"
                  : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-wide text-emerald-300"
              }
            >
              {resetMessage}
            </p>
          ) : null}
        </form>

        <div className="space-y-2 text-center text-xs text-white/50">
          <p>Need help? Contact your Bunker administrator.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-primary transition hover:text-primary/80"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
