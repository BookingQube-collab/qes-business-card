import { leadHue } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

/** Mini gradient-border card thumbnail (HTML prototype style). */
export function CardThumb({ lead }: { lead: Lead }) {
  const [c1, c2] = leadHue(`${lead.id}${lead.company}`);

  if (lead.business_card_image?.startsWith("http") || lead.business_card_image?.startsWith("blob:") || lead.business_card_image?.startsWith("data:")) {
    return (
      <div
        className="h-[34px] w-14 rounded-md p-px"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lead.business_card_image}
          alt=""
          className="h-full w-full rounded-[5px] object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="h-[34px] w-14 rounded-md p-px"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <div className="flex h-full w-full flex-col justify-center gap-[3px] rounded-[5px] bg-[#12141d] px-1.5">
        <div className="h-[3px] w-[70%] rounded-sm bg-[rgba(226,232,240,0.75)]" />
        <div className="h-0.5 w-[48%] rounded-sm bg-[rgba(148,163,184,0.6)]" />
        <div className="h-0.5 w-[60%] rounded-sm bg-[rgba(148,163,184,0.4)]" />
      </div>
    </div>
  );
}
