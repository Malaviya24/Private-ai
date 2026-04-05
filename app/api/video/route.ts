import { NextRequest, NextResponse } from "next/server";
import { getTextToVideoConfig } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 60;

const allowedAspectRatios = new Set(["auto", "1:1", "4:5", "9:16", "16:9"]);

type NsfwResponse = {
  code?: number;
  success?: boolean;
  data?: Array<{ nsfw?: boolean }>;
};

type JobResponse = {
  code?: number;
  key?: string;
};

type VideoPollResponse = {
  code?: number;
  datas?: Array<{
    url?: string;
    safe?: string;
  }>;
};

function buildBaseHeaders(config: ReturnType<typeof getTextToVideoConfig>) {
  return {
    "User-Agent": "okhttp/5.1.0",
    "Accept-Encoding": "gzip",
    authorization: config.authorization,
    sign: config.sign,
    pt: config.pt,
    v: config.version,
    deviceid: config.deviceId
  };
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt = body?.prompt?.trim();
  const aspectRatio = typeof body?.aspectRatio === "string" && allowedAspectRatios.has(body.aspectRatio)
    ? body.aspectRatio
    : "auto";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const cooldownResponse = getCooldownResponse(request, "video");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  const config = getTextToVideoConfig();
  const baseHeaders = buildBaseHeaders(config);
  const jsonHeaders = {
    ...baseHeaders,
    "Content-Type": "application/json; charset=utf-8"
  };

  try {
    const nsfwPayload = new URLSearchParams({
      prompt,
      ctry_target: "others",
      versionCode: config.version,
      deviceID: config.deviceId,
      isPremium: "0"
    });

    const nsfwResponse = await fetch(`${config.baseUrl}/nsfw`, {
      method: "POST",
      headers: baseHeaders,
      body: nsfwPayload,
      cache: "no-store"
    });

    const nsfwData = (await nsfwResponse.json()) as NsfwResponse;

    if (nsfwData.code !== 0 || !nsfwData.success) {
      return NextResponse.json(
        { error: "NSFW check failed." },
        { status: 400 }
      );
    }

    if (nsfwData.data?.[0]?.nsfw) {
      return NextResponse.json(
        { error: "Prompt flagged as NSFW." },
        { status: 400 }
      );
    }

    const jobResponse = await fetch(`${config.baseUrl}/txt2videov3`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        ai_sound: 1,
        aspect_ratio: aspectRatio,
        ctry_target: "others",
        deviceID: config.deviceId,
        isPremium: 0,
        prompt,
        used: [],
        versionCode: Number(config.version)
      }),
      cache: "no-store"
    });

    const jobData = (await jobResponse.json()) as JobResponse;

    if (jobData.code !== 0 || !jobData.key) {
      return NextResponse.json(
        { error: "Video generation job could not be created." },
        { status: 400 }
      );
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const pollResponse = await fetch(`${config.baseUrl}/video`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ keys: [jobData.key] }),
        cache: "no-store"
      });

      const pollData = (await pollResponse.json()) as VideoPollResponse;
      const url = pollData.datas?.[0]?.url;

      if (pollData.code === 0 && url) {
        const filename = url.split("/").pop() || "video.mp4";
        startCooldown(request, "video");

        return NextResponse.json({
          status: "success",
          url,
          filename,
          safe: pollData.datas?.[0]?.safe || "unknown",
          prompt,
          aspectRatio
        });
      }

      await delay(3000);
    }

    return NextResponse.json(
      { error: "Video generation timed out." },
      { status: 504 }
    );
  } catch (error) {
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to generate the video right now.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
