import { NextRequest, NextResponse } from "next/server";
import { getAdultImageApiUrl } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 30;

type ExternalAdultImageResponse = {
  status?: string;
  message?: string;
  url?: string;
  result?: string[] | string;
  images?: string[];
  image?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const cooldownResponse = getCooldownResponse(request, "adult-image");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  try {
    const url = new URL(getAdultImageApiUrl());
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
        { error: "18+ image provider returned an error." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ExternalAdultImageResponse;
    const possibleImages = [
      data.url,
      data.image,
      ...(Array.isArray(data.images) ? data.images : []),
      ...(Array.isArray(data.result) ? data.result : [data.result])
    ];
    const images = possibleImages.filter((item): item is string => typeof item === "string" && item.length > 0);

    if (data.status !== "success" || images.length === 0) {
      return NextResponse.json(
        { error: data.error || data.message || "18+ image generation failed." },
        { status: 400 }
      );
    }

    startCooldown(request, "adult-image");

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
        : "Unable to generate the 18+ image right now.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
