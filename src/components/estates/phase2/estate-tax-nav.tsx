import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const workspaceItems = [
  { href: "valuation", label: "Business Valuation" },
  { href: "tax/pre-death", label: "Pre-death ITR12" },
  { href: "tax/cgt", label: "CGT on Death" },
  { href: "tax/estate-duty", label: "Estate Duty" },
  { href: "tax/post-death", label: "Post-death IT-AE" },
  { href: "filing-pack", label: "Filing Pack" },
] as const;

export function EstateTaxNav({
  estateId,
  currentPath,
}: {
  estateId: string;
  currentPath?: string;
}) {
  return (
    <Card>
      <CardTitle>Phase 2 Tax Workspaces</CardTitle>
      <CardDescription className="mt-1">
        Open the valuation, tax, and filing-pack workspaces for this estate.
      </CardDescription>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Phase 2 tax workspaces">
        {workspaceItems.map((item) => {
          const href = `/estates/${estateId}/${item.href}`;
          const isActive = currentPath === href;

          return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "border-[#0E2433] bg-[#0E2433] text-white"
                  : "border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50/40 hover:text-teal-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
