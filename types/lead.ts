export type Priority = "Hot" | "Warm" | "Cold";

export type Interest =
  | "WhatsApp AI"
  | "Contact Center"
  | "FEC Solutions"
  | "Events"
  | "Partnership"
  | "Other";

export type Owner = "Rajan" | "Nicole" | "Waqar" | "Mary";

export interface Lead {
  id: string;
  name: string;
  company: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  interest: Interest;
  priority: Priority;
  owner: Owner;
  notes: string | null;
  business_card_image: string | null;
  created_at: string;
  updated_at: string;
}

/** Optional `created_at` lets bulk import backdate booth-day leads. */
export type CreateLeadInput = Omit<Lead, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

export interface LeadFilters {
  search: string;
  priority: Priority | "All";
  interest: Interest | "All";
  owner: Owner | "All";
  date: "All" | "Today" | "Yesterday" | "This Week";
}

export interface LeadStats {
  total: number;
  today: number;
  hot: number;
}
