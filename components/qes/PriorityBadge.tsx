import type { Priority } from "@/types/lead";
import { priorityClass } from "@/lib/lead-utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-[3px] text-[11.5px] font-bold ${priorityClass(priority)}`}
    >
      {priority}
    </span>
  );
}

export function InterestBadge({ interest }: { interest: string }) {
  return (
    <span className="inline-block rounded-md border border-[#e0e7ff] bg-[#f2f6ff] px-[9px] py-[3px] text-xs font-medium text-[#3b4c8a]">
      {interest}
    </span>
  );
}
