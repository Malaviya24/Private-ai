"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ApiStatus } from "@/lib/types";

type WebToZipErrorResponse = {
  error?: string;
  message?: string;
  retryAfter?: number;
};

function parseDownloadFilename(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]).replace(/[/\\?%*:|"<>]/g, "-");
  } catch {
    return match[1].replace(/[/\\?%*:|"<>]/g, "-");
  }
}

export function WebToZip({
  onActivity
}: {
  onActivity?: (item: { type: "webzip"; prompt: string; status: "success" | "error"; detail: string }) => void;
}) {
  const [websiteUrl, setWebsiteUrl] = useState("example.com");
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (cooldownUntil <= clock) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [clock, cooldownUntil]);

  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - clock) / 1000));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!websiteUrl.trim()) {
      setStatus("error");
      setError("Enter a valid website URL or domain.");
      setLastDownload(null);
      onActivity?.({
        type: "webzip",
        prompt: websiteUrl.trim() || "(empty)",
        status: "error",
        detail: "Enter a valid website URL or domain."
      });
      return;
    }

    setStatus("loading");
    setError(null);
    setLastDownload(null);

    try {
      const response = await fetch(`/api/web-to-zip?url=${encodeURIComponent(websiteUrl.trim())}`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as WebToZipErrorResponse | null;

        if (response.status === 429 && payload?.retryAfter) {
          setCooldownUntil(Date.now() + payload.retryAfter * 1000);
          setClock(Date.now());
        }

        throw new Error(payload?.error || payload?.message || "Failed to create ZIP file.");
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The provider returned an empty ZIP file.");
      }

      const fallbackName = `website-${Date.now()}.zip`;
      const filename = parseDownloadFilename(response.headers.get("content-disposition")) || fallbackName;
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      setStatus("success");
      setLastDownload(`${websiteUrl.trim()} -> ${filename}`);
      setCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
      onActivity?.({
        type: "webzip",
        prompt: websiteUrl.trim(),
        status: "success",
        detail: `zip downloaded (${filename})`
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to download ZIP.";
      setStatus("error");
      setError(message);
      onActivity?.({
        type: "webzip",
        prompt: websiteUrl.trim() || "(empty)",
        status: "error",
        detail: message
      });
    }
  }

  return (
    <section className="lookup-stage">
      <article className="brutal-panel webzip-shell">
        <div className="section-topline">
          <div>
            <p className="section-label">service five</p>
            <h2 className="service-title">Web to ZIP</h2>
          </div>
          <span className={`status-badge status-${status}`}>web-zip: {status}</span>
        </div>

        <p className="service-copy lookup-copy">
          Paste any website URL and download its zipped source through a secure server route, without exposing provider details in the browser.
        </p>
        <p className="result-strip">
          Captures website source assets like HTML, CSS, JS, images, fonts, and linked media files.
        </p>

        <form onSubmit={handleSubmit} className="brutal-form webzip-form">
          <label htmlFor="websiteUrl">Website URL</label>
          <div className="lookup-form-row">
            <input
              id="websiteUrl"
              type="text"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="example.com or https://example.com"
              className="lookup-input"
              autoComplete="off"
            />
            <button
              type="submit"
              className="brutal-button brutal-button-accent lookup-submit"
              disabled={status === "loading" || cooldownSeconds > 0}
            >
              {status === "loading" ? "Building..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Download ZIP"}
            </button>
          </div>

          <p className="lookup-helper" aria-live="polite">
            {cooldownSeconds > 0
              ? `Web to ZIP is on cooldown. Try again in ${cooldownSeconds}s.`
              : "Use a domain or full URL. A ZIP download starts immediately after success."}
          </p>
        </form>

        {error ? <div className="error-board webzip-feedback">{error}</div> : null}
        {!error && status === "success" && lastDownload ? (
          <p className="result-strip webzip-success">Downloaded: {lastDownload}</p>
        ) : null}
      </article>
    </section>
  );
}
