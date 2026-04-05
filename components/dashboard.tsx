"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ActivityItem, ApiStatus, LogoResult, VideoResult } from "@/lib/types";
import { MobileLookup } from "@/components/mobile-lookup";

const starterPrompts = [
  "Luxury fashion house emblem with golden chrome",
  "Cyberpunk gaming brand mascot in 3D cartoon style",
  "Travel reel of monsoon streets in Mumbai at night",
  "Launch teaser for a futuristic startup office"
];

const tickerItems = [
  "3D logo drops",
  "text to video runs",
  "server-side secrets only",
  "10 second cooldown live",
  "mobile lookup live"
];

const logoFrames = [
  { id: "square", label: "1:1 Square", hint: "avatars and marks" },
  { id: "poster", label: "4:5 Poster", hint: "social cards" },
  { id: "landscape", label: "3:2 Landscape", hint: "covers and headers" },
  { id: "banner", label: "16:9 Banner", hint: "hero banners" }
] as const;

const videoFrames = [
  { id: "auto", label: "Auto", value: "auto", hint: "let provider choose" },
  { id: "square", label: "1:1", value: "1:1", hint: "feed posts" },
  { id: "poster", label: "4:5", value: "4:5", hint: "portrait social" },
  { id: "reel", label: "9:16", value: "9:16", hint: "reels and shorts" },
  { id: "wide", label: "16:9", value: "16:9", hint: "youtube and web" }
] as const;

type LogoResponse = LogoResult & {
  retryAfter?: number;
};

type VideoResponse = VideoResult & {
  error?: string;
  retryAfter?: number;
};

type LogoFrame = (typeof logoFrames)[number];
type VideoFrame = (typeof videoFrames)[number];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "accent" | "secondary" | "muted" | "paper";
}) {
  return (
    <article className={`brutal-stat brutal-tone-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ label, status }: { label: string; status: ApiStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      {label}: {status}
    </span>
  );
}

function ActivityFeed({ activity }: { activity: ActivityItem[] }) {
  return (
    <section className="brutal-panel brutal-paper-panel">
      <div className="section-topline">
        <div>
          <p className="section-label">run log</p>
          <h3 className="section-title">Recent activity</h3>
        </div>
        <span className="sticker-pill sticker-pill-secondary">live</span>
      </div>

      <div className="activity-stack">
        {activity.length === 0 ? (
          <div className="empty-board">No runs yet. Fire one generator and the log starts shouting back.</div>
        ) : (
          activity.map((item) => (
            <article key={item.id} className={`activity-card activity-${item.type}`}>
              <div>
                <p className="activity-kicker">{item.type === "logo" ? "logo generator" : "text to video"}</p>
                <strong>{item.prompt}</strong>
              </div>
              <div className="activity-meta">
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
                <small>{item.detail}</small>
                <small>{formatTime(item.createdAt)}</small>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function FramePicker<T extends { id: string; label: string; hint: string }>({
  title,
  options,
  selected,
  onSelect,
  accent
}: {
  title: string;
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  accent: "accent" | "secondary";
}) {
  return (
    <div className="frame-block">
      <div className="frame-heading-row">
        <span className="frame-label">{title}</span>
        <span className={`mini-sticker ${accent === "accent" ? "mini-sticker-accent" : "mini-sticker-secondary"}`}>
          resolution
        </span>
      </div>
      <div className="frame-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`frame-button ${selected.id === option.id ? "is-selected" : ""}`}
            onClick={() => onSelect(option)}
          >
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneratorForm<T extends { id: string; label: string; hint: string }>({
  id,
  title,
  kicker,
  description,
  prompt,
  onChange,
  onSubmit,
  buttonLabel,
  busyLabel,
  isBusy,
  cooldownSeconds,
  cooldownLabel,
  accent,
  frameTitle,
  frameOptions,
  selectedFrame,
  onSelectFrame
}: {
  id: string;
  title: string;
  kicker: string;
  description: string;
  prompt: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  buttonLabel: string;
  busyLabel: string;
  isBusy: boolean;
  cooldownSeconds: number;
  cooldownLabel: string;
  accent: "accent" | "secondary";
  frameTitle: string;
  frameOptions: readonly T[];
  selectedFrame: T;
  onSelectFrame: (option: T) => void;
}) {
  return (
    <section className={`brutal-panel brutal-service brutal-service-${accent}`}>
      <div className="section-topline">
        <div>
          <p className="section-label">{kicker}</p>
          <h2 className="service-title">{title}</h2>
        </div>
        <span className={`sticker-pill ${accent === "accent" ? "sticker-pill-accent" : "sticker-pill-muted"}`}>
          secure route
        </span>
      </div>

      <p className="service-copy">{description}</p>

      <form onSubmit={onSubmit} className="generator-form brutal-form">
        <FramePicker
          title={frameTitle}
          options={frameOptions}
          selected={selectedFrame}
          onSelect={onSelectFrame}
          accent={accent}
        />
        <label htmlFor={id}>Prompt</label>
        <textarea
          id={id}
          value={prompt}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type a bold prompt and launch it."
          rows={5}
        />
        <button
          type="submit"
          className={`brutal-button brutal-button-${accent}`}
          disabled={isBusy || cooldownSeconds > 0}
        >
          {isBusy ? busyLabel : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : buttonLabel}
        </button>
        <p className="cooldown-note" aria-live="polite">
          {cooldownSeconds > 0
            ? `${cooldownLabel} locked for ${cooldownSeconds}s after the last run.`
            : "One request at a time, then a hard 10 second cooldown."}
        </p>
      </form>
    </section>
  );
}

function LogoGallery({
  status,
  result,
  error
}: {
  status: ApiStatus;
  result: LogoResult | null;
  error: string | null;
}) {
  return (
    <section className="brutal-panel brutal-paper-panel">
      <div className="section-topline">
        <div>
          <p className="section-label">output board</p>
          <h3 className="section-title">Logo previews</h3>
        </div>
        <StatusBadge label="logo" status={status} />
      </div>

      {result?.frame ? <p className="result-strip">Requested frame: {result.frame}</p> : null}
      {status === "loading" ? <div className="empty-board loading-board">Generating sticker-ready logo shots...</div> : null}
      {error ? <div className="error-board">{error}</div> : null}

      {result?.images?.length ? (
        <div className="logo-grid">
          {result.images.map((image, index) => (
            <a key={`${image}-${index}`} className="output-card" href={image} target="_blank" rel="noreferrer">
              <img src={image} alt={`Generated logo ${index + 1}`} />
              <span>Open full size</span>
            </a>
          ))}
        </div>
      ) : null}

      {!error && status !== "loading" && !result?.images?.length ? (
        <div className="empty-board">Your generated logos will pin themselves here like posters on a wall.</div>
      ) : null}
    </section>
  );
}

function VideoPreview({
  status,
  result,
  error
}: {
  status: ApiStatus;
  result: VideoResult | null;
  error: string | null;
}) {
  return (
    <section className="brutal-panel brutal-dark-panel">
      <div className="section-topline">
        <div>
          <p className="section-label">output board</p>
          <h3 className="section-title">Video preview</h3>
        </div>
        <StatusBadge label="video" status={status} />
      </div>

      {result?.aspectRatio ? <p className="result-strip result-strip-dark">Requested ratio: {result.aspectRatio}</p> : null}
      {status === "loading" ? <div className="empty-board loading-board">Polling frames, checking the final cut, waiting for the file...</div> : null}
      {error ? <div className="error-board">{error}</div> : null}

      {result?.url ? (
        <div className="video-shell">
          <video src={result.url} controls playsInline className="video-player" />
          <div className="video-meta">
            <div>
              <p>filename</p>
              <strong>{result.filename}</strong>
            </div>
            <div>
              <p>safety</p>
              <strong>{result.safe}</strong>
            </div>
            <a className="brutal-link" href={result.url} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </div>
        </div>
      ) : null}

      {!error && status !== "loading" && !result?.url ? (
        <div className="empty-board">Finished videos land here with instant playback and a direct open link.</div>
      ) : null}
    </section>
  );
}

function ArchitectureBoard() {
  return (
    <section className="brutal-panel brutal-muted-panel">
      <div className="section-topline">
        <div>
          <p className="section-label">system notes</p>
          <h3 className="section-title">How it is wired</h3>
        </div>
        <span className="sticker-pill sticker-pill-paper">next.js</span>
      </div>

      <div className="note-grid">
        <article className="note-card">
          <strong>/api/logo</strong>
          <p>Server route normalizes your logo provider response and now passes your requested frame as prompt guidance.</p>
        </article>
        <article className="note-card">
          <strong>/api/video</strong>
          <p>Server route runs NSFW screening, creates a video job, and submits the selected aspect ratio to the provider.</p>
        </article>
        <article className="note-card">
          <strong>/api/lookup</strong>
          <p>Server route validates the 10-digit number, injects the lookup API key, and returns normalized records for the client cards.</p>
        </article>
        <article className="note-card">
          <strong>cooldown layer</strong>
          <p>Each generator gets a hard 10 second lock after a successful run so users cannot spam the provider.</p>
        </article>
      </div>
    </section>
  );
}

export function Dashboard() {
  const [logoPrompt, setLogoPrompt] = useState(starterPrompts[0]);
  const [videoPrompt, setVideoPrompt] = useState(starterPrompts[2]);
  const [logoFrame, setLogoFrame] = useState<LogoFrame>(logoFrames[0]);
  const [videoFrame, setVideoFrame] = useState<VideoFrame>(videoFrames[0]);
  const [logoStatus, setLogoStatus] = useState<ApiStatus>("idle");
  const [videoStatus, setVideoStatus] = useState<ApiStatus>("idle");
  const [logoResult, setLogoResult] = useState<LogoResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [logoCooldownUntil, setLogoCooldownUntil] = useState(0);
  const [videoCooldownUntil, setVideoCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const hasActiveCooldown = logoCooldownUntil > clock || videoCooldownUntil > clock;

    if (!hasActiveCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [clock, logoCooldownUntil, videoCooldownUntil]);

  const stats = useMemo(() => {
    const successful = activity.filter((item) => item.status === "success").length;
    const failed = activity.filter((item) => item.status === "error").length;
    const logoRuns = activity.filter((item) => item.type === "logo").length;
    const videoRuns = activity.filter((item) => item.type === "video").length;

    return {
      successful,
      failed,
      logoRuns,
      videoRuns
    };
  }, [activity]);

  const logoCooldownSeconds = Math.max(0, Math.ceil((logoCooldownUntil - clock) / 1000));
  const videoCooldownSeconds = Math.max(0, Math.ceil((videoCooldownUntil - clock) / 1000));

  function pushActivity(item: Omit<ActivityItem, "id" | "createdAt">) {
    setActivity((current) => [
      {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      },
      ...current
    ].slice(0, 8));
  }

  async function handleLogoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogoStatus("loading");
    setLogoError(null);
    setLogoResult(null);

    try {
      const response = await fetch("/api/logo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: logoPrompt, frame: logoFrame.label })
      });

      const data = (await response.json()) as LogoResponse;

      if (!response.ok || !data.success) {
        if (response.status === 429 && data.retryAfter) {
          const nextAllowedAt = Date.now() + data.retryAfter * 1000;
          setLogoCooldownUntil(nextAllowedAt);
          setClock(Date.now());
        }

        throw new Error(data.message || "Logo generation failed.");
      }

      setLogoResult(data);
      setLogoStatus("success");
      setLogoCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
      pushActivity({
        type: "logo",
        prompt: logoPrompt,
        status: "success",
        detail: `${data.frame || logoFrame.label} ready`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected logo error.";
      setLogoStatus("error");
      setLogoError(message);
      setLogoResult(null);
      pushActivity({
        type: "logo",
        prompt: logoPrompt,
        status: "error",
        detail: message
      });
    }
  }

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVideoStatus("loading");
    setVideoError(null);
    setVideoResult(null);

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: videoPrompt, aspectRatio: videoFrame.value })
      });

      const data = (await response.json()) as VideoResponse;

      if (!response.ok || data.status !== "success") {
        if (response.status === 429 && data.retryAfter) {
          const nextAllowedAt = Date.now() + data.retryAfter * 1000;
          setVideoCooldownUntil(nextAllowedAt);
          setClock(Date.now());
        }

        throw new Error(data.error || "Video generation failed.");
      }

      setVideoResult(data);
      setVideoStatus("success");
      setVideoCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
      pushActivity({
        type: "video",
        prompt: videoPrompt,
        status: "success",
        detail: `${data.aspectRatio || videoFrame.value} ${data.filename}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected video error.";
      setVideoStatus("error");
      setVideoError(message);
      setVideoResult(null);
      pushActivity({
        type: "video",
        prompt: videoPrompt,
        status: "error",
        detail: message
      });
    }
  }

  return (
    <main className="neo-page">
      <section className="ticker-strip" aria-label="studio updates">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`} className="ticker-item">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="hero-grid">
        <header className="brutal-panel hero-panel">
          <span className="sticker-pill sticker-pill-accent hero-badge">malaviya ai studio</span>
          <p className="section-label">creative control room</p>
          <h1 className="hero-title">
            <span>LOUD</span>
            <span className="outlined-word">AI</span>
            <span>DASHBOARD</span>
          </h1>
          <p className="hero-copy">
            One sharp-edged Next.js workspace for your logo, text-to-video, and mobile lookup APIs. Hard borders. Hard cooldowns.
            Server-only secrets. Zero corporate blur.
          </p>

          <div className="hero-prompt-rack">
            {starterPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                className={`prompt-sticker ${index % 2 === 0 ? "prompt-sticker-accent" : "prompt-sticker-secondary"}`}
                onClick={() => {
                  setLogoPrompt(prompt);
                  setVideoPrompt(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="hero-status-row">
            <StatusBadge label="logo" status={logoStatus} />
            <StatusBadge label="video" status={videoStatus} />
          </div>
        </header>

        <aside className="hero-chaos">
          <div className="chaos-card chaos-card-primary">
            <span className="chaos-chip">server only</span>
            <strong>Secrets stay behind API routes.</strong>
          </div>
          <div className="chaos-card chaos-card-secondary">
            <span className="chaos-chip">cooldown</span>
            <strong>10s lock after every successful run.</strong>
          </div>
          <div className="chaos-card chaos-card-muted">
            <span className="chaos-chip">frame presets</span>
            <strong>Square, poster, reel, and banner buttons are live.</strong>
          </div>
          <div className="burst-shape burst-one" aria-hidden="true" />
          <div className="burst-shape burst-two" aria-hidden="true" />
        </aside>
      </section>

      <section className="stat-grid">
        <StatCard label="successful runs" value={String(stats.successful)} tone="secondary" />
        <StatCard label="logo requests" value={String(stats.logoRuns)} tone="accent" />
        <StatCard label="video requests" value={String(stats.videoRuns)} tone="muted" />
        <StatCard label="errors caught" value={String(stats.failed)} tone="paper" />
      </section>

      <section className="workspace-grid">
        <GeneratorForm
          id="logoPrompt"
          title="3D Logo Generator"
          kicker="service one"
          description="Feed the logo route a strong prompt, choose a frame, and it returns normalized image links ready for preview."
          prompt={logoPrompt}
          onChange={setLogoPrompt}
          onSubmit={handleLogoSubmit}
          buttonLabel="Generate Logo"
          busyLabel="Generating..."
          isBusy={logoStatus === "loading"}
          cooldownSeconds={logoCooldownSeconds}
          cooldownLabel="Logo generator"
          accent="accent"
          frameTitle="Photo frame"
          frameOptions={logoFrames}
          selectedFrame={logoFrame}
          onSelectFrame={setLogoFrame}
        />

        <LogoGallery status={logoStatus} result={logoResult} error={logoError} />

        <GeneratorForm
          id="videoPrompt"
          title="Text to Video"
          kicker="service two"
          description="Choose the video frame first, then the route checks NSFW, creates the job, polls for completion, and returns the final file."
          prompt={videoPrompt}
          onChange={setVideoPrompt}
          onSubmit={handleVideoSubmit}
          buttonLabel="Generate Video"
          busyLabel="Rendering..."
          isBusy={videoStatus === "loading"}
          cooldownSeconds={videoCooldownSeconds}
          cooldownLabel="Video generator"
          accent="secondary"
          frameTitle="Video frame"
          frameOptions={videoFrames}
          selectedFrame={videoFrame}
          onSelectFrame={setVideoFrame}
        />

        <VideoPreview status={videoStatus} result={videoResult} error={videoError} />
      </section>

      <MobileLookup />

      <section className="lower-grid">
        <ActivityFeed activity={activity} />
        <ArchitectureBoard />
      </section>
    </main>
  );
}

