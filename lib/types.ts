export type ApiStatus = "idle" | "loading" | "success" | "error";

export type LogoResult = {
  success: boolean;
  prompt: string;
  images: string[];
  frame?: string;
  developer?: string;
  message?: string;
};

export type VideoResult = {
  status: "success";
  url: string;
  filename: string;
  safe: string;
  prompt: string;
  aspectRatio?: string;
};

export type LookupFieldValue = string | number | boolean | null;

export type LookupRecord = Record<string, LookupFieldValue>;

export type LookupResult = {
  success: boolean;
  number: string;
  status?: string;
  count: number;
  searchTime?: string;
  results: LookupRecord[];
  message?: string;
};

export type ActivityItem = {
  id: string;
  type: "logo" | "video";
  prompt: string;
  createdAt: string;
  status: "success" | "error";
  detail: string;
};

