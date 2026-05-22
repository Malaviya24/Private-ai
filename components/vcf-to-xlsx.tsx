"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { ApiStatus } from "@/lib/types";

type VcfXlsxErrorResponse = {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function VcfToXlsx({
  onActivity
}: {
  onActivity?: (item: { type: "vcfXlsx"; prompt: string; status: "success" | "error"; detail: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;

    if (next && !next.name.toLowerCase().endsWith(".vcf")) {
      setStatus("error");
      setError("Please choose a .vcf file exported from your phone or Google Contacts.");
      setFile(null);
      setContactCount(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    setFile(next);
    setStatus("idle");
    setError(null);
    setLastDownload(null);
    setContactCount(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("error");
      setError("Choose a .vcf contacts file before uploading.");
      onActivity?.({
        type: "vcfXlsx",
        prompt: "(no file)",
        status: "error",
        detail: "no file selected"
      });
      return;
    }

    setStatus("loading");
    setError(null);
    setLastDownload(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/vcf-to-xlsx", {
        method: "POST",
        body: formData,
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as VcfXlsxErrorResponse | null;

        if (response.status === 429 && payload?.retryAfter) {
          setCooldownUntil(Date.now() + payload.retryAfter * 1000);
          setClock(Date.now());
        }

        throw new Error(payload?.error || payload?.message || "Could not convert this file to XLSX.");
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("The server returned an empty workbook.");
      }

      const fallbackName = `${file.name.replace(/\.vcf$/i, "") || "contacts"}-contacts.xlsx`;
      const filename = parseDownloadFilename(response.headers.get("content-disposition")) || fallbackName;
      const headerCount = response.headers.get("x-contact-count");
      const parsedCount = headerCount ? Number(headerCount) : NaN;

      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      const finalCount = Number.isFinite(parsedCount) ? parsedCount : null;
      setContactCount(finalCount);
      setStatus("success");
      setLastDownload(`${file.name} -> ${filename}`);
      setCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
      onActivity?.({
        type: "vcfXlsx",
        prompt: file.name,
        status: "success",
        detail:
          finalCount !== null ? `${finalCount} contact${finalCount === 1 ? "" : "s"} exported` : "xlsx downloaded"
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to convert file.";
      setStatus("error");
      setError(message);
      onActivity?.({
        type: "vcfXlsx",
        prompt: file.name,
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
            <p className="section-label">service six</p>
            <h2 className="service-title">VCF to Excel (.xlsx)</h2>
          </div>
          <span className={`status-badge status-${status}`}>vcf-xlsx: {status}</span>
        </div>

        <p className="service-copy lookup-copy">
          Upload a .vcf contacts export from your phone or Google Contacts and download a clean Excel workbook with every name,
          phone number, email, address, and note in tidy columns.
        </p>
        <p className="result-strip">
          Supports vCard 2.1, 3.0, and 4.0 with quoted-printable encoding. Your file stays in memory and is never written to disk.
        </p>

        <form onSubmit={handleSubmit} className="brutal-form webzip-form">
          <label htmlFor="vcfFile">VCF file</label>
          <div className="lookup-form-row">
            <input
              id="vcfFile"
              ref={inputRef}
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              onChange={handleFileChange}
              className="lookup-input vcf-input"
            />
            <button
              type="submit"
              className="brutal-button brutal-button-accent lookup-submit"
              disabled={status === "loading" || cooldownSeconds > 0 || !file}
            >
              {status === "loading"
                ? "Converting..."
                : cooldownSeconds > 0
                ? `Wait ${cooldownSeconds}s`
                : "Convert to XLSX"}
            </button>
          </div>

          <p className="lookup-helper" aria-live="polite">
            {file
              ? `Selected: ${file.name} (${formatBytes(file.size)})`
              : cooldownSeconds > 0
              ? `VCF to XLSX is on cooldown. Try again in ${cooldownSeconds}s.`
              : "Up to 10 MB. Multiple contacts in one file are fully supported."}
          </p>
        </form>

        {error ? <div className="error-board webzip-feedback">{error}</div> : null}
        {!error && status === "success" && lastDownload ? (
          <p className="result-strip webzip-success">
            Downloaded: {lastDownload}
            {contactCount !== null ? ` (${contactCount} contact${contactCount === 1 ? "" : "s"})` : ""}
          </p>
        ) : null}
      </article>
    </section>
  );
}
