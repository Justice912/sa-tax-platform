import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { LoginForm } from "@/components/common/login-form";
import { authOptions } from "@/lib/auth-options";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">TaxOps ZA</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in to your compliance workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          South African tax workflow management for practitioners and review teams.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

