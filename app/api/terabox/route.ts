import { NextRequest, NextResponse } from "next/server";
import { getTeraboxConfig } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_HOSTS = new Set([
  "terabox.com",
  "www.terabox.com",
  "1024terabox.com",
  "www.1024terabox.com",
  "teraboxapp.com",
  "www.teraboxapp.com",
  "terasharelink.com",
  "www.terasharelink.com",
  "nephobox.com",
  "www.nephobox.com",
  "freeterabox.com",
  "www.freeterabox.com",
  "4funbox.com",
  "www.4funbox.com",
  "mirrobox.com",
  "www.mirrobox.com",
  "momerybox.com",
  "www.momerybox.com",
  "tibibox.com",
  "www.tibibox.com",
  "terafileshare.com",
  "www.terafileshare.com",
  "1024tera.com",
  "www.1024tera.com"
]);

function looksLikeTeraboxUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) {
      return true;
    }
    // Also accept any subdomain ending with one of the known hosts.
    return Array.from(ALLOWED_HOSTS).some((allowed) => host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = (request.nextUrl.searchParams.get("url") ?? "").trim();

  if (!url) {
    return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
  }

  if (!looksLikeTeraboxUrl(url)) {
    return NextResponse.json(
      { success: false, error: "Please paste a valid TeraBox share link." },
      { status: 400 }
    );
  }

  const cooldownResponse = getCooldownResponse(request, "terabox");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  const { baseUrl, apiKey } = getTeraboxConfig();
  const target = new URL(baseUrl);
  target.searchParams.set("key", apiKey);
  target.searchParams.set("url", url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(target, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            (payload && (payload.error || payload.message)) ||
            `TeraBox provider returned ${upstream.status}.`
        },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    startCooldown(request, "terabox");
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "TeraBox request timed out. Please try again." },
        { status: 504 }
      );
    }

    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Failed to fetch video.";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
