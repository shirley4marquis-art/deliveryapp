"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({
        error: "Unexpected response from server.",
      }));

      if (!response.ok) {
        setLoading(false);
        setError(data.error || "Unable to sign in. Please try again.");
        return;
      }

      // Hard redirect — ensures fresh session cookie is sent with the next request
      window.location.href = "/admin";
    } catch {
      setLoading(false);
      setError("Network error — please check your connection and try again.");
    }
  }

  return (
    <form
      className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-md"
      onSubmit={login}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0047bb] text-white">
          <Lock size={18} />
        </span>
        <div>
          <h2 className="text-xl font-black text-[#07152f]">Admin Login</h2>
          <p className="text-xs font-semibold text-[#50627f]">
            TBC secure access
          </p>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-bold text-[#10213f]">Email address</span>
        <input
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-[#0047bb]"
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-[#10213f]">Password</span>
        <input
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-[#0047bb]"
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <button
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0047bb] px-5 py-3 text-sm font-bold text-white disabled:opacity-60 hover:bg-[#0039a0]"
        disabled={loading}
        type="submit"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>

      {loading && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Verifying credentials, please wait…
        </p>
      )}
    </form>
  );
}
