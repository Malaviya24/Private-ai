"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LookupFieldValue, LookupRecord, LookupResult } from "@/lib/types";

const HISTORY_KEY = "malaviya-lookup-history";
const HISTORY_LIMIT = 5;

const fieldLabels: Record<string, string> = {
  mobile: "Mobile number",
  name: "Name",
  fname: "Father name",
  address: "Address",
  alt: "Alternate number",
  circle: "Circle",
  id: "Record ID",
  email: "Email"
};

type LookupApiError = {
  success?: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
};

function sanitizeMobileNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidMobileNumber(value: string) {
  return /^\d{10}$/.test(value);
}

function formatFieldLabel(key: string) {
  return fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldValue(value: LookupFieldValue) {
  if (value === null || value === "") {
    return "N/A";
  }

  return String(value);
}

function formatLookupCopy(result: LookupResult) {
  const header = [
    `Number: ${result.number}`,
    `Matches: ${result.count}`,
    result.searchTime ? `Search time: ${result.searchTime}` : null
  ].filter(Boolean);

  const records = result.results.flatMap((record, index) => [
    ``,
    `Match ${index + 1}`,
    ...Object.entries(record).map(([key, value]) => `${formatFieldLabel(key)}: ${formatFieldValue(value)}`)
  ]);

  return [...header, ...records].join("\n");
}

function formatRecordCopy(record: LookupRecord, index: number) {
  return [`Match ${index + 1}`, ...Object.entries(record).map(([key, value]) => `${formatFieldLabel(key)}: ${formatFieldValue(value)}`)].join("\n");
}

function readHistory() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);

    if (!raw) {
      return [] as string[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

// Keep only the five most recent searches on the client.
function persistHistory(number: string) {
  const nextHistory = [number, ...readHistory().filter((item) => item !== number)].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

function LookupStatusBadge({ isLoading, hasError, hasResult }: { isLoading: boolean; hasError: boolean; hasResult: boolean }) {
  const tone = isLoading ? "loading" : hasError ? "error" : hasResult ? "success" : "idle";
  const label = isLoading ? "searching" : hasError ? "issue" : hasResult ? "ready" : "idle";

  return <span className={`status-badge status-${tone}`}>lookup: {label}</span>;
}

export function MobileLookup() {
  const [number, setNumber] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    if (cooldownUntil <= clock) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [clock, cooldownUntil]);

  const hasResults = (result?.results.length ?? 0) > 0;
  const hasError = Boolean(validationError || requestError);
  const totalMatches = useMemo(() => result?.results.length ?? 0, [result]);
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - clock) / 1000));

  async function copyText(text: string, target: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => {
        setCopiedTarget((current) => (current === target ? null : current));
      }, 1800);
    } catch {
      setRequestError("Copy failed. Clipboard access may be blocked in this browser.");
    }
  }

  async function runLookup(numberToSearch: string) {
    if (isLoading || cooldownSeconds > 0) {
      return;
    }

    setIsLoading(true);
    setValidationError(null);
    setRequestError(null);
    setResult(null);
    setCopiedTarget(null);

    try {
      const response = await fetch(`/api/lookup?number=${numberToSearch}`, {
        method: "GET",
        cache: "no-store"
      });

      const data = ((await response.json().catch(() => null)) || {}) as LookupResult & LookupApiError;

      if (response.status === 429 && data.retryAfter) {
        setCooldownUntil(Date.now() + data.retryAfter * 1000);
        setClock(Date.now());
        setValidationError(`Please wait ${data.retryAfter}s before searching again.`);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Lookup failed.");
      }

      setResult(data);
      setHistory(persistHistory(numberToSearch));
      setCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete the lookup.";
      setRequestError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanNumber = sanitizeMobileNumber(number);
    setNumber(cleanNumber);

    if (!isValidMobileNumber(cleanNumber)) {
      setValidationError("Enter a valid 10-digit mobile number.");
      setRequestError(null);
      setResult(null);
      return;
    }

    if (cooldownSeconds > 0) {
      setValidationError(`Please wait ${cooldownSeconds}s before searching again.`);
      return;
    }

    await runLookup(cleanNumber);
  }

  return (
    <section className="lookup-stage">
      <article className="brutal-panel lookup-shell">
        <div className="section-topline">
          <div>
            <p className="section-label">service three</p>
            <h2 className="service-title">Mobile Lookup</h2>
          </div>
          <LookupStatusBadge isLoading={isLoading} hasError={hasError} hasResult={hasResults} />
        </div>

        <p className="service-copy lookup-copy">
          Search a 10-digit number through a secure Next.js route, keep the API key off the client, and review every returned field in a clean result stack.
        </p>

        <div className="lookup-grid">
          <div className="lookup-panel lookup-form-panel">
            <form onSubmit={handleSubmit} className="brutal-form">
              <label htmlFor="mobileNumber">Mobile number</label>
              <div className="lookup-form-row">
                <input
                  id="mobileNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  value={number}
                  onChange={(event) => {
                    const nextValue = sanitizeMobileNumber(event.target.value);
                    setNumber(nextValue);

                    if (validationError && isValidMobileNumber(nextValue) && cooldownSeconds === 0) {
                      setValidationError(null);
                    }
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="lookup-input"
                  aria-invalid={hasError}
                />
                <button
                  type="submit"
                  className="brutal-button brutal-button-accent lookup-submit"
                  disabled={isLoading || cooldownSeconds > 0}
                >
                  {isLoading ? "Searching..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Search Number"}
                </button>
              </div>
              <p className="lookup-helper" aria-live="polite">
                {validationError ||
                  (cooldownSeconds > 0
                    ? `Lookup is on a 10 second cooldown. Try again in ${cooldownSeconds}s.`
                    : "Digits only. The search runs through your secure server route.")}
              </p>
            </form>

            <div className="lookup-history-block">
              <div className="frame-heading-row">
                <span className="frame-label">Recent searches</span>
                <span className="mini-sticker mini-sticker-accent">local</span>
              </div>

              {history.length === 0 ? (
                <div className="empty-board lookup-history-empty">Your last five searches will appear here.</div>
              ) : (
                <div className="lookup-history-list">
                  {history.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="history-chip"
                      disabled={isLoading || cooldownSeconds > 0}
                      onClick={() => {
                        setNumber(item);
                        void runLookup(item);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lookup-panel lookup-result-panel">
            {isLoading ? (
              <div className="search-state" role="status" aria-live="polite">
                <span className="search-spinner" aria-hidden="true" />
                <strong>Searching...</strong>
                <p>Fetching mobile details from the lookup service.</p>
              </div>
            ) : null}

            {!isLoading && requestError ? <div className="error-board">{requestError}</div> : null}

            {!isLoading && !requestError && result && !hasResults ? (
              <div className="empty-board">{result.message || "No data found."}</div>
            ) : null}

            {!isLoading && !requestError && hasResults && result ? (
              <div className="lookup-output-stack">
                <div className="lookup-toolbar">
                  <div>
                    <p className="section-label">search result</p>
                    <h3 className="section-title">{result.number}</h3>
                  </div>
                  <button
                    type="button"
                    className="brutal-button brutal-button-secondary lookup-copy-button"
                    onClick={() => void copyText(formatLookupCopy(result), "all")}
                  >
                    {copiedTarget === "all" ? "Copied" : "Copy All"}
                  </button>
                </div>

                <div className="lookup-summary-grid">
                  <article className="lookup-summary-card">
                    <span>Matches</span>
                    <strong>{totalMatches}</strong>
                  </article>
                  <article className="lookup-summary-card">
                    <span>Status</span>
                    <strong>{result.status || "unknown"}</strong>
                  </article>
                  <article className="lookup-summary-card">
                    <span>Search time</span>
                    <strong>{result.searchTime || "N/A"}</strong>
                  </article>
                </div>

                <div className="lookup-result-grid">
                  {result.results.map((record, index) => (
                    <article key={`${record.mobile || record.id || index}-${index}`} className="lookup-result-card">
                      <div className="lookup-result-head">
                        <div>
                          <p className="section-label">match {index + 1}</p>
                          <h4 className="lookup-result-title">{formatFieldValue(record.name || record.mobile || `Record ${index + 1}`)}</h4>
                        </div>
                        <button
                          type="button"
                          className="brutal-button brutal-button-accent lookup-copy-button"
                          onClick={() => void copyText(formatRecordCopy(record, index), `record-${index}`)}
                        >
                          {copiedTarget === `record-${index}` ? "Copied" : "Copy"}
                        </button>
                      </div>

                      <div className="lookup-field-grid">
                        {Object.entries(record).map(([key, value]) => (
                          <div key={`${key}-${index}`} className="lookup-field">
                            <span>{formatFieldLabel(key)}</span>
                            <strong>{formatFieldValue(value)}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {!isLoading && !requestError && !result ? (
              <div className="empty-board">Enter a 10-digit number to fetch matching records securely from the server.</div>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
