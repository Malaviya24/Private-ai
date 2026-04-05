import "server-only";
import { NextRequest, NextResponse } from "next/server";

const COOLDOWN_MS = 10_000;

const globalForCooldown = globalThis as typeof globalThis & {
  __malaviyaCooldownStore?: Map<string, number>;
};

const cooldownStore = globalForCooldown.__malaviyaCooldownStore ?? new Map<string, number>();
globalForCooldown.__malaviyaCooldownStore = cooldownStore;

function getClientAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "anonymous";
}

function getCooldownKey(request: NextRequest, scope: string) {
  return `${scope}:${getClientAddress(request)}`;
}

export function getCooldownResponse(request: NextRequest, scope: string) {
  const key = getCooldownKey(request, scope);
  const now = Date.now();
  const expiresAt = cooldownStore.get(key) ?? 0;
  const remainingMs = expiresAt - now;

  if (remainingMs > 0) {
    const retryAfter = Math.ceil(remainingMs / 1000);

    return NextResponse.json(
      {
        error: `Please wait ${retryAfter}s before generating again.`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter)
        }
      }
    );
  }

  for (const [entryKey, entryExpiresAt] of cooldownStore.entries()) {
    if (entryExpiresAt <= now) {
      cooldownStore.delete(entryKey);
    }
  }

  return null;
}

export function startCooldown(request: NextRequest, scope: string) {
  const key = getCooldownKey(request, scope);
  cooldownStore.set(key, Date.now() + COOLDOWN_MS);
}
