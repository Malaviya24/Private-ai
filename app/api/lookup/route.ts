import { NextRequest, NextResponse } from "next/server";
import { getLookupConfig } from "@/lib/api-config";

export const runtime = "nodejs";
export const maxDuration = 30;

type ExternalLookupRecord = Record<string, string | number | boolean | null | undefined>;

type ExternalLookupResponse = {
  owner?: string;
  number?: string;
  message?: string;
  result?: {
    status?: string;
    count?: number;
    search_time?: string;
    owner?: string;
    results?: ExternalLookupRecord[];
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
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Lookup provider is unavailable right now." },
        { status: 502 }
      );
    }

    const data = (await response.json()) as ExternalLookupResponse;
    const results = Array.isArray(data.result?.results)
      ? data.result.results.map(normalizeRecord)
      : [];

    return NextResponse.json(
      {
        success: true,
        number: data.number || number,
        owner: data.result?.owner || data.owner,
        status: data.result?.status || "unknown",
        count: typeof data.result?.count === "number" ? data.result.count : results.length,
        searchTime: data.result?.search_time,
        results,
        message: results.length === 0 ? data.message || "No data found." : undefined
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to fetch lookup details right now.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}


