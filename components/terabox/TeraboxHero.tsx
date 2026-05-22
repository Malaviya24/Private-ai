"use client";

import { useState, type FormEvent } from "react";

interface HeroProps {
  onFetch: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export function TeraboxHero({ onFetch, loading, error }: HeroProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (trimmed) {
      onFetch(trimmed);
    }
  };

  return (
    <section className="tb-hero">
      <div className="tb-hero-badge">✦ Instant TeraBox Streaming</div>
      <h1 className="tb-hero-title">
        Stream Any
        <br />
        <em>TeraBox Video</em>
        <br />
        Instantly
      </h1>
      <p className="tb-hero-sub">
        Paste your TeraBox link below and watch in HD — no downloads, no waiting.
      </p>

      <form className="tb-search-form" onSubmit={handleSubmit}>
        <div className="tb-input-wrap">
          <span className="tb-input-icon">⟡</span>
          <input
            type="url"
            className="tb-url-input"
            placeholder="https://1024terabox.com/s/..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" className="tb-fetch-btn" disabled={loading}>
            {loading ? (
              <span className="tb-spinner" />
            ) : (
              <>
                Stream <span>→</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div className="tb-error-card">
          <span>⚠</span> {error}
        </div>
      ) : null}

      <div className="tb-hero-stats">
        <div className="tb-stat">
          <span>4K</span> Max Quality
        </div>
        <div className="tb-stat-divider" />
        <div className="tb-stat">
          <span>0s</span> Buffer Time
        </div>
        <div className="tb-stat-divider" />
        <div className="tb-stat">
          <span>∞</span> Free Streams
        </div>
      </div>
    </section>
  );
}
