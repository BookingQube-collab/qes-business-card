export type ExtractedBusinessCard = {
  name: string | null;
  company: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
};

export const EMPTY_EXTRACTED: ExtractedBusinessCard = {
  name: null,
  company: null,
  position: null,
  phone: null,
  email: null,
};
