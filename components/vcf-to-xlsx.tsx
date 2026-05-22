"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { ApiStatus } from "@/lib/types";
import { buildContactRows, parseVcf } from "@/lib/vcf-parser";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeBaseName(value: string) {
  const trimmed = value
    .replace(/\.vcf$/i, "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return trimmed || "contacts";
}

async function readFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(buffer);
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
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      setError("Choose a .vcf contacts file before converting.");
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

    try {
      const text = await readFileAsText(file);

      if (!/^BEGIN:VCARD/im.test(text)) {
        throw new Error("This file does not look like a vCard (.vcf) file.");
      }

      const contacts = parseVcf(text);

      if (contacts.length === 0) {
        throw new Error("No contacts were found inside the selected file.");
      }

      // Lazy-load SheetJS only when the user actually converts a file. This
      // keeps the initial page bundle slim.
      const XLSX = await import("xlsx");

      const { rows } = buildContactRows(contacts);
      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      const columnWidths = rows[0].map((_, columnIndex) => {
        let max = 10;
        for (const row of rows) {
          const cell = row[columnIndex];
          const length = cell == null ? 0 : String(cell).length;
          if (length > max) {
            max = length;
          }
        }
        return { wch: Math.min(max + 2, 60) };
      });

      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

      const arrayBuffer = XLSX.write(workbook, {
        type: "array",
        bookType: "xlsx",
        compression: true
      }) as ArrayBuffer;

      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const filename = `${sanitizeBaseName(file.name)}-contacts.xlsx`;
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      setContactCount(contacts.length);
      setStatus("success");
      setLastDownload(`${file.name} -> ${filename}`);
      onActivity?.({
        type: "vcfXlsx",
        prompt: file.name,
        status: "success",
        detail: `${contacts.length} contact${contacts.length === 1 ? "" : "s"} exported`
      });
    } catch (conversionError) {
      const message = conversionError instanceof Error ? conversionError.message : "Unable to convert file.";
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
          Upload a .vcf contacts export from your phone or Google Contacts and get back a clean Excel workbook with every name,
          phone number, email, address, and note in tidy columns.
        </p>
        <p className="result-strip">
          Runs fully in your browser. Your file never leaves your device. Supports vCard 2.1, 3.0, and 4.0 with quoted-printable encoding.
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
              disabled={status === "loading" || !file}
            >
              {status === "loading" ? "Converting..." : "Convert to XLSX"}
            </button>
          </div>

          <p className="lookup-helper" aria-live="polite">
            {file
              ? `Selected: ${file.name} (${formatBytes(file.size)})`
              : "Pick any .vcf file. Conversion happens locally in your browser, no upload involved."}
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
