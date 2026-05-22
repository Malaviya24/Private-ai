import { useState, type FormEvent } from 'react';
import './Hero.css';

interface HeroProps {
  onFetch: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export default function Hero({ onFetch, loading, error }: HeroProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) onFetch(url.trim());
  };

  return (
    <section className="hero">
      <div className="hero-badge">✦ Instant TeraBox Streaming</div>
      <h1 className="hero-title">
        Stream Any<br />
        <em>TeraBox Video</em><br />
        Instantly
      </h1>
      <p className="hero-sub">
        Paste your TeraBox link below and watch in HD — no downloads, no waiting.
      </p>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="input-wrap">
          <span className="input-icon">⟡</span>
          <input
            type="url"
            className="url-input"
            placeholder="https://1024terabox.com/s/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" className="fetch-btn" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <>Stream <span>→</span></>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-card">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="hero-stats">
        <div className="stat"><span>4K</span> Max Quality</div>
        <div className="stat-divider" />
        <div className="stat"><span>0s</span> Buffer Time</div>
        <div className="stat-divider" />
        <div className="stat"><span>∞</span> Free Streams</div>
      </div>
    </section>
  );
}
