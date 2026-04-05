import { NextRequest, NextResponse } from "next/server";
import { getLogoApiUrl } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

type ExternalLogoResponse = {
  success?: boolean;
  message?: string;
  images_with_background?: string[];
  images?: string[];
  with_background?: string[];
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json(
      { success: false, message: "Prompt is required." },
      { status: 400 }
    );
  }

  const cooldownResponse = getCooldownResponse(request, "logo");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  try {
    const response = await fetch(getLogoApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt }),
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Logo provider returned an error." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ExternalLogoResponse;

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.message || "Logo generation failed." },
        { status: 400 }
      );
    }

    const images =
      data.images_with_background || data.images || data.with_background || [];

    startCooldown(request, "logo");

    return NextResponse.json({
      success: true,
      prompt,
      images,
      developer: "@ab_devs"
    });
  } catch (error) {
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to generate the logo right now.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
