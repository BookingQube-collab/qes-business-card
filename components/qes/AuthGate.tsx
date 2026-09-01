"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthGateProps = {
  onAuthed: () => void;
};

export function AuthGate({ onAuthed }: AuthGateProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message || "Sign-in failed");
        return;
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0b0c11] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[20px] border border-[#1e2230] bg-[#11131b] p-6 shadow-2xl"
      >
        <div className="qes-logo mb-4 flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-[12.5px] font-bold">
          QES
        </div>
        <h1 className="text-lg font-semibold text-white">Staff sign-in</h1>
        <p className="mt-1 text-sm text-slate-400">
          Booth access only — no public signup.
        </p>

        <label className="mt-5 block text-xs font-medium text-slate-400">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input-dark mt-1.5"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-slate-400">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input-dark mt-1.5"
          />
        </label>

        {error ? (
          <p className="mt-3 text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="qes-gradient-btn mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
