import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { AppShell } from "@/components/layout/app-shell";
import { authOptions } from "@/lib/auth-options";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

