import { NextRequest, NextResponse } from "next/server";
import { getLookupConfig } from "@/lib/api-config";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExternalLookupRecord = Record<string, string | number | boolean | null | undefined>;

type ExternalLookupResponse = {
  warning?: string;
  success?: boolean;
  api?: string;
  owner?: string;
  message?: string;
  data?: {
    success?: boolean;
    cached?: boolean;
    proxyUsed?: string;
    attempt?: number;
    result?: {
      status?: string;
      count?: number;
      search_time?: string;
      results?: ExternalLookupRecord[];
    };
  };
};

function isValidMobileNumber(value: string) {
  return /^\d{10}$/.test(value);
}

// Normalize null-ish values so every returned field can be rendered consistently.
function normalizeRecord(record: ExternalLookupRecord) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value ?? ""])
  );
}

export async function GET(request: NextRequest) {
  const number = request.nextUrl.searchParams.get("number")?.trim() ?? "";

  if (!isValidMobileNumber(number)) {
    return NextResponse.json(
      { success: false, message: "Enter a valid 10-digit mobile number." },
      { status: 400 }
    );
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 15_000);

  try {
    const { baseUrl, apiKey } = getLookupConfig();
    const url = new URL(baseUrl);
    url.searchParams.set("number", number);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: timeoutController.signal
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Lookup provider is unavailable right now." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as ExternalLookupResponse;
    const lookupResult = payload.data?.result;
    const results = Array.isArray(lookupResult?.results)
      ? lookupResult.results.map(normalizeRecord)
      : [];

    return NextResponse.json(
      {
        success: payload.success !== false && payload.data?.success !== false,
        number,
        owner: payload.owner,
        status: lookupResult?.status || "unknown",
        count: typeof lookupResult?.count === "number" ? lookupResult.count : results.length,
        searchTime: lookupResult?.search_time,
        results,
        message: results.length === 0 ? payload.message || "No data found." : undefined
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { success: false, message: "Lookup provider timed out. Please try again in a moment." },
        { status: 504 }
      );
    }

    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to fetch lookup details right now.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
