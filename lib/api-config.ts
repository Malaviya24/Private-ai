import "server-only";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing on the server.`);
  }

  return value;
}

export function getLogoApiUrl() {
  return process.env.LOGO_API_URL || "https://viscodev.x10.mx/3D_CARTOON/api.php";
}

export function getTextToImageApiUrl() {
  return process.env.TEXT_TO_IMAGE_API_URL || "https://text-to-img.apis-bj-devs.workers.dev/";
}

export function getAdultImageApiUrl() {
  return process.env.ADULT_IMAGE_API_URL || "https://nsfw-image.freeapihub.workers.dev/";
}

export function getTextToVideoConfig() {
  return {
    baseUrl: process.env.TEXT_TO_VIDEO_BASE_URL || "https://text2video.aritek.app",
    authorization: requireEnv("TEXT_TO_VIDEO_AUTHORIZATION"),
    sign: requireEnv("TEXT_TO_VIDEO_SIGN"),
    pt: process.env.TEXT_TO_VIDEO_PT ?? "",
    deviceId: process.env.TEXT_TO_VIDEO_DEVICE_ID || "1b5336ed0297604a",
    version: process.env.TEXT_TO_VIDEO_VERSION || "72"
  };
}

export function getWebToZipApiUrl() {
  return process.env.WEB_TO_ZIP_API_URL || "https://web2zip-pink.vercel.app/zip";
}
