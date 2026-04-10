import { NextRequest, NextResponse } from "next/server";
import { getWebToZipApiUrl } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 60;

function normalizeWebsiteUrl(value: string) {
  const input = value.trim();

  if (!input) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  try {
    const parsed = new URL(candidate);

    if (!parsed.hostname || parsed.hostname.includes(" ")) {
      return null;
    }

    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function extractFilename(contentDisposition: string | null, sourceUrl: string) {
  const filenameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

  if (filenameMatch?.[1]) {
    return filenameMatch[1].replace(/[/\\?%*:|"<>]/g, "-");
  }

  const hostname = new URL(sourceUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");
  return `${hostname || "website"}-source.zip`;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";
  const websiteUrl = normalizeWebsiteUrl(rawUrl);

  if (!websiteUrl) {
    return NextResponse.json(
      { error: "Enter a valid website URL or domain." },
      { status: 400 }
    );
  }

  const cooldownResponse = getCooldownResponse(request, "web-to-zip");

  if (cooldownResponse) {
    return cooldownResponse;
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 45_000);

  try {
    const providerUrl = new URL(getWebToZipApiUrl());
    providerUrl.searchParams.set("url", websiteUrl);

    const upstreamResponse = await fetch(providerUrl, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Web to ZIP provider is unavailable right now." },
        { status: 502 }
      );
    }

    const contentType = upstreamResponse.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const jsonPayload = (await upstreamResponse.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      return NextResponse.json(
        { error: jsonPayload?.error || jsonPayload?.message || "Web to ZIP conversion failed." },
        { status: 400 }
      );
    }

    if (!upstreamResponse.body) {
      return NextResponse.json(
        { error: "No ZIP file was returned by the provider." },
        { status: 502 }
      );
    }

    const filename = extractFilename(upstreamResponse.headers.get("content-disposition"), websiteUrl);
    startCooldown(request, "web-to-zip");

    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Web to ZIP request timed out. Please try again." },
        { status: 504 }
      );
    }

    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to fetch ZIP right now.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
