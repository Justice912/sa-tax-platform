"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("admin@ubuntutax.co.za");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const response = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl,
        });

        setLoading(false);

        if (!response || response.error) {
          setError("Login failed. Verify your credentials and try again.");
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-[#0E2433] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#12344a] disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-xs text-slate-500">Demo password for seeded users: <code>ChangeMe123!</code></p>
    </form>
  );
}

