import { NextRequest, NextResponse } from "next/server";
import { getWebToZipApiUrl } from "@/lib/api-config";
import { getCooldownResponse, startCooldown } from "@/lib/request-cooldown";

export const runtime = "nodejs";
export const maxDuration = 60;

type WebToZipServiceResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  download_url?: string;
  tmpfiles_url?: string;
  local_download_url?: string;
};

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

function sanitizeFilename(value: string) {
  return value.replace(/[/\\?%*:|"<>]/g, "-");
}

function extractFilename(contentDisposition: string | null, sourceUrl: string, downloadUrl?: string) {
  const filenameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

  if (filenameMatch?.[1]) {
    return sanitizeFilename(filenameMatch[1]);
  }

  if (downloadUrl) {
    try {
      const downloadPathName = new URL(downloadUrl).pathname.split("/").pop();

      if (downloadPathName) {
        return sanitizeFilename(decodeURIComponent(downloadPathName));
      }
    } catch {
      // Fall through to hostname-based fallback.
    }
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
    const serviceUrl = new URL(getWebToZipApiUrl());
    serviceUrl.searchParams.set("url", websiteUrl);

    const serviceResponse = await fetch(serviceUrl, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    const servicePayload = (await serviceResponse.json().catch(() => null)) as WebToZipServiceResponse | null;

    if (!serviceResponse.ok) {
      return NextResponse.json(
        { error: servicePayload?.error || servicePayload?.message || "Web to ZIP service is unavailable right now." },
        { status: 502 }
      );
    }

    if (!servicePayload?.success) {
      return NextResponse.json(
        { error: servicePayload?.error || servicePayload?.message || "Web to ZIP conversion failed." },
        { status: 400 }
      );
    }

    const downloadUrl = servicePayload.download_url || servicePayload.tmpfiles_url || servicePayload.local_download_url;

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "ZIP was generated but download URL is missing from service response." },
        { status: 502 }
      );
    }

    let normalizedDownloadUrl: string;

    try {
      normalizedDownloadUrl = new URL(downloadUrl).toString();
    } catch {
      return NextResponse.json(
        { error: "Web to ZIP service returned an invalid download URL." },
        { status: 502 }
      );
    }

    const zipResponse = await fetch(normalizedDownloadUrl, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!zipResponse.ok) {
      return NextResponse.json(
        { error: "Generated ZIP could not be downloaded right now." },
        { status: 502 }
      );
    }

    const zipContentType = zipResponse.headers.get("content-type") ?? "";

    if (zipContentType.includes("application/json")) {
      const zipErrorPayload = (await zipResponse.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      return NextResponse.json(
        { error: zipErrorPayload?.error || zipErrorPayload?.message || "ZIP download URL returned an error." },
        { status: 502 }
      );
    }

    if (!zipResponse.body) {
      return NextResponse.json(
        { error: "No ZIP file was returned by the download URL." },
        { status: 502 }
      );
    }

    const filename = extractFilename(
      zipResponse.headers.get("content-disposition"),
      websiteUrl,
      normalizedDownloadUrl
    );

    startCooldown(request, "web-to-zip");

    return new NextResponse(zipResponse.body, {
      status: 200,
      headers: {
        "Content-Type": zipContentType || "application/zip",
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
