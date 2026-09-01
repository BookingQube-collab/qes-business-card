import type { LeadStats } from "@/types/lead";

export function ReportStats({ stats }: { stats: LeadStats }) {
  return (
    <div className="grid grid-cols-3 gap-3" style={{ gap: 12 }}>
      <ReportStatBox
        label="Total Collected"
        value={stats.total}
        valueClass="text-[26px] text-slate-900 sm:text-[28px]"
        accent
      />
      <ReportStatBox
        label="Today"
        value={stats.today}
        valueClass="text-[22px] text-[#0891b2]"
      />
      <ReportStatBox
        label="Hot Leads"
        value={stats.hot}
        valueClass="text-[22px] text-[#e11d74]"
      />
    </div>
  );
}

function ReportStatBox({
  label,
  value,
  valueClass,
  accent,
}: {
  label: string;
  value: number;
  valueClass: string;
  accent?: boolean;
}) {
  return (
    <div className="relative flex flex-col gap-[9px] overflow-hidden rounded-xl border border-[#e6e8ec] bg-white px-[18px] py-4">
      {accent ? (
        <div className="qes-kpi-accent absolute inset-x-0 top-0 h-[3px]" />
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p className={`font-semibold leading-tight tracking-[-0.02em] tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
