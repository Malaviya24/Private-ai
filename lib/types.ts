export type ApiStatus = "idle" | "loading" | "success" | "error";

export type LogoResult = {
  success: boolean;
  prompt: string;
  images: string[];
  developer?: string;
  message?: string;
};

export type VideoResult = {
  status: "success";
  url: string;
  filename: string;
  safe: string;
  prompt: string;
};

export type ActivityItem = {
  id: string;
  type: "logo" | "video";
  prompt: string;
  createdAt: string;
  status: "success" | "error";
  detail: string;
};
