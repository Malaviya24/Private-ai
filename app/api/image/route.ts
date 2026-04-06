import { NextRequest, NextResponse } from "next/server";
import { getTextToImageApiUrl } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 30;

type ExternalImageResponse = {
  status?: string;
  message?: string;
  result?: string[] | string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const cooldownResponse = getCooldownResponse(request, "image");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  try {
    const url = new URL(getTextToImageApiUrl());
    url.searchParams.set("prompt", prompt);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Image provider returned an error." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ExternalImageResponse;
    const images = Array.isArray(data.result)
      ? data.result.filter((item): item is string => typeof item === "string" && item.length > 0)
      : typeof data.result === "string" && data.result.length > 0
        ? [data.result]
        : [];

    if (data.status !== "success" || images.length === 0) {
      return NextResponse.json(
        { error: data.message || "Image generation failed." },
        { status: 400 }
      );
    }

    startCooldown(request, "image");

    return NextResponse.json({
      status: "success",
      prompt,
      images,
      message: data.message
    });
  } catch (error) {
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to generate the image right now.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
