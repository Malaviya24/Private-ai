export type ApiStatus = "idle" | "loading" | "success" | "error";

export type LogoResult = {
  success: boolean;
  prompt: string;
  images: string[];
  frame?: string;
  developer?: string;
  message?: string;
};

export type ImageResult = {
  status: "success";
  prompt: string;
  images: string[];
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

export type ActivityItem = {
  id: string;
  type: "logo" | "image" | "adultImage" | "video" | "webzip";
  prompt: string;
  createdAt: string;
  status: "success" | "error";
  detail: string;
};
