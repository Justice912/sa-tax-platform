import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardDescription>{title}</CardDescription>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {subtitle ? <CardTitle className="mt-3 text-xs text-slate-500">{subtitle}</CardTitle> : null}
    </Card>
  );
}

