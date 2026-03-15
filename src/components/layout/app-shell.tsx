import type { ReactNode } from "react";
import Link from "next/link";
import {
  Calculator,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Library,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PROFESSIONAL_REVIEW_DISCLAIMER } from "@/lib/disclaimers";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Cases", href: "/cases", icon: ShieldCheck },
  { label: "Estates", href: "/estates", icon: Scale },
  { label: "ITR12", href: "/itr12", icon: Calculator },
  { label: "Individual Tax", href: "/individual-tax", icon: Calculator },
  { label: "Knowledge Base", href: "/knowledge-base", icon: Library },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Admin", href: "/admin/settings", icon: FileText },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-teal-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[260px,1fr]">
        <aside className="border-r border-slate-200/80 bg-[#0E2433] px-5 py-6 text-slate-100">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight">TaxOps ZA</h1>
            <p className="text-xs text-slate-300">South African Compliance Workspace</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="p-5 lg:p-8">
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {PROFESSIONAL_REVIEW_DISCLAIMER}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

