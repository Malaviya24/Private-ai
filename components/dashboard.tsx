"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ActivityItem, ApiStatus, ImageResult, LogoResult, VideoResult } from "@/lib/types";
import { MobileLookup } from "@/components/mobile-lookup";

const starterPrompts = [
  "Luxury fashion house emblem with golden chrome",
  "Cute girl portrait with soft lighting and anime-inspired detail",
  "Travel reel of monsoon streets in Mumbai at night",
  "Launch teaser for a futuristic startup office"
];

const tickerItems = [
  "3D logo drops",
  "text to image live",
  "text to video runs",
  "server-side secrets only",
  "10 second cooldown live",
  "mobile lookup live"
];

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

type ImageResponse = ImageResult & {
  error?: string;
  retryAfter?: number;
};

type VideoResponse = VideoResult & {
  error?: string;
  retryAfter?: number;
};

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
  const labels: Record<ActivityItem["type"], string> = {
    logo: "logo generator",
    image: "text to image",
    video: "text to video"
  };

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
          <div className="empty-board">No runs yet. Launch a tool and your latest activity will appear here.</div>
        ) : (
          activity.map((item) => (
            <article key={item.id} className={`activity-card activity-${item.type}`}>
              <div>
                <p className="activity-kicker">{labels[item.type]}</p>
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

function GeneratorForm<T extends { id: string; label: string; hint: string } = { id: string; label: string; hint: string }>({
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
  frameTitle?: string;
  frameOptions?: readonly T[];
  selectedFrame?: T;
  onSelectFrame?: (option: T) => void;
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
        {frameTitle && frameOptions && selectedFrame && onSelectFrame ? (
          <FramePicker
            title={frameTitle}
            options={frameOptions}
            selected={selectedFrame}
            onSelect={onSelectFrame}
            accent={accent}
          />
        ) : null}
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
        <div className="empty-board">Your generated logos will appear here with ready-to-open preview links.</div>
      ) : null}
    </section>
  );
}

function ImageGallery({
  status,
  result,
  error
}: {
  status: ApiStatus;
  result: ImageResult | null;
  error: string | null;
}) {
  return (
    <section className="brutal-panel brutal-paper-panel">
      <div className="section-topline">
        <div>
          <p className="section-label">output board</p>
          <h3 className="section-title">Image previews</h3>
        </div>
        <StatusBadge label="image" status={status} />
      </div>

      {status === "loading" ? <div className="empty-board loading-board">Rendering image concepts from your prompt...</div> : null}
      {error ? <div className="error-board">{error}</div> : null}

      {result?.images?.length ? (
        <div className="logo-grid">
          {result.images.map((image, index) => (
            <a key={`${image}-${index}`} className="output-card" href={image} target="_blank" rel="noreferrer">
              <img src={image} alt={`Generated image ${index + 1}`} />
              <span>Open full size</span>
            </a>
          ))}
        </div>
      ) : null}

      {!error && status !== "loading" && !result?.images?.length ? (
        <div className="empty-board">Generated image results will appear here with direct open links.</div>
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
          <p>Server route protects the provider integration, normalizes responses, and returns ready-to-preview logo assets.</p>
        </article>
        <article className="note-card">
          <strong>/api/image</strong>
          <p>Server route proxies the text-to-image provider, normalizes the returned image URLs, and keeps usage controlled with cooldowns.</p>
        </article>
        <article className="note-card">
          <strong>/api/video</strong>
          <p>Server route screens prompts, creates the generation job, polls progress, and returns the final rendered video file.</p>
        </article>
        <article className="note-card">
          <strong>/api/lookup</strong>
          <p>Server route validates 10-digit numbers, secures the lookup key, and returns only normalized result data for display.</p>
        </article>
        <article className="note-card">
          <strong>cooldown layer</strong>
          <p>Request cooldowns reduce provider strain, prevent abuse, and keep the experience stable for repeated use.</p>
        </article>
      </div>
    </section>
  );
}

export function Dashboard() {
  const [logoPrompt, setLogoPrompt] = useState(starterPrompts[0]);
  const [imagePrompt, setImagePrompt] = useState(starterPrompts[1]);
  const [videoPrompt, setVideoPrompt] = useState(starterPrompts[2]);
  const [videoFrame, setVideoFrame] = useState<VideoFrame>(videoFrames[0]);
  const [logoStatus, setLogoStatus] = useState<ApiStatus>("idle");
  const [imageStatus, setImageStatus] = useState<ApiStatus>("idle");
  const [videoStatus, setVideoStatus] = useState<ApiStatus>("idle");
  const [logoResult, setLogoResult] = useState<LogoResult | null>(null);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [logoCooldownUntil, setLogoCooldownUntil] = useState(0);
  const [imageCooldownUntil, setImageCooldownUntil] = useState(0);
  const [videoCooldownUntil, setVideoCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const hasActiveCooldown = logoCooldownUntil > clock || imageCooldownUntil > clock || videoCooldownUntil > clock;

    if (!hasActiveCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [clock, logoCooldownUntil, imageCooldownUntil, videoCooldownUntil]);

  const stats = useMemo(() => {
    const successful = activity.filter((item) => item.status === "success").length;
    const failed = activity.filter((item) => item.status === "error").length;
    const logoRuns = activity.filter((item) => item.type === "logo").length;
    const imageRuns = activity.filter((item) => item.type === "image").length;
    const videoRuns = activity.filter((item) => item.type === "video").length;

    return {
      successful,
      failed,
      logoRuns,
      imageRuns,
      videoRuns
    };
  }, [activity]);

  const logoCooldownSeconds = Math.max(0, Math.ceil((logoCooldownUntil - clock) / 1000));
  const imageCooldownSeconds = Math.max(0, Math.ceil((imageCooldownUntil - clock) / 1000));
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
        body: JSON.stringify({ prompt: logoPrompt })
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
        detail: "logo ready"
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

  async function handleImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImageStatus("loading");
    setImageError(null);
    setImageResult(null);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: imagePrompt })
      });

      const data = (await response.json()) as ImageResponse;

      if (!response.ok || data.status !== "success") {
        if (response.status === 429 && data.retryAfter) {
          const nextAllowedAt = Date.now() + data.retryAfter * 1000;
          setImageCooldownUntil(nextAllowedAt);
          setClock(Date.now());
        }

        throw new Error(data.error || data.message || "Image generation failed.");
      }

      setImageResult(data);
      setImageStatus("success");
      setImageCooldownUntil(Date.now() + 10_000);
      setClock(Date.now());
      pushActivity({
        type: "image",
        prompt: imagePrompt,
        status: "success",
        detail: `${data.images.length} image option${data.images.length === 1 ? "" : "s"}`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected image error.";
      setImageStatus("error");
      setImageError(message);
      setImageResult(null);
      pushActivity({
        type: "image",
        prompt: imagePrompt,
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
          <p className="section-label">professional ai workspace</p>
          <h1 className="hero-title">
            <span>MALAVIYA</span>
            <span className="outlined-word">AI</span>
            <span>STUDIO</span>
          </h1>
          <p className="hero-copy">
            A production-ready AI workspace for logo generation, image creation, video production, and secure mobile lookup workflows.
            Built with protected server routes, responsive controls, and dependable tools for real-world production use.
          </p>

          <div className="hero-prompt-rack">
            {starterPrompts.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                className={`prompt-sticker ${index % 2 === 0 ? "prompt-sticker-accent" : "prompt-sticker-secondary"}`}
                onClick={() => {
                  setLogoPrompt(prompt);
                  setImagePrompt(prompt);
                  setVideoPrompt(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="hero-status-row">
            <StatusBadge label="logo" status={logoStatus} />
            <StatusBadge label="image" status={imageStatus} />
            <StatusBadge label="video" status={videoStatus} />
          </div>
        </header>

        <aside className="hero-chaos">
          <div className="chaos-card chaos-card-primary">
            <span className="chaos-chip">secure backend</span>
            <strong>Server routes protect your keys and keep every request secure.</strong>
          </div>
          <div className="chaos-card chaos-card-secondary">
            <span className="chaos-chip">stable usage</span>
            <strong>Built-in cooldowns keep traffic stable and production usage reliable.</strong>
          </div>
          <div className="chaos-card chaos-card-muted">
            <span className="chaos-chip">all in one</span>
            <strong>Production-ready tools for logos, images, videos, and mobile lookup workflows.</strong>
          </div>
          <div className="burst-shape burst-one" aria-hidden="true" />
          <div className="burst-shape burst-two" aria-hidden="true" />
        </aside>
      </section>

      <section className="stat-grid">
        <StatCard label="successful runs" value={String(stats.successful)} tone="secondary" />
        <StatCard label="logo requests" value={String(stats.logoRuns)} tone="accent" />
        <StatCard label="image requests" value={String(stats.imageRuns)} tone="muted" />
        <StatCard label="video requests" value={String(stats.videoRuns)} tone="paper" />
        <StatCard label="errors caught" value={String(stats.failed)} tone="secondary" />
      </section>

      <section className="workspace-grid">
        <GeneratorForm
          id="logoPrompt"
          title="3D Logo Generator"
          kicker="service one"
          description="Generate polished logo concepts from a single prompt and review normalized preview links instantly."
          prompt={logoPrompt}
          onChange={setLogoPrompt}
          onSubmit={handleLogoSubmit}
          buttonLabel="Generate Logo"
          busyLabel="Generating..."
          isBusy={logoStatus === "loading"}
          cooldownSeconds={logoCooldownSeconds}
          cooldownLabel="Logo generator"
          accent="accent"
        />

        <LogoGallery status={logoStatus} result={logoResult} error={logoError} />

        <GeneratorForm
          id="imagePrompt"
          title="Text to Image"
          kicker="service two"
          description="Turn a text prompt into generated image concepts and review direct preview links inside the dashboard."
          prompt={imagePrompt}
          onChange={setImagePrompt}
          onSubmit={handleImageSubmit}
          buttonLabel="Generate Image"
          busyLabel="Rendering..."
          isBusy={imageStatus === "loading"}
          cooldownSeconds={imageCooldownSeconds}
          cooldownLabel="Image generator"
          accent="secondary"
        />

        <ImageGallery status={imageStatus} result={imageResult} error={imageError} />

        <GeneratorForm
          id="videoPrompt"
          title="Text to Video"
          kicker="service three"
          description="Create short AI videos with server-side safety checks, job polling, and ready-to-play final output."
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

      <footer className="brutal-panel site-footer">
        <div>
          <p className="section-label">support the studio</p>
          <h3 className="section-title">Support Independent Development</h3>
          <p className="footer-copy">
            If this platform helps you, support future updates, better infrastructure, and new AI tools here.
          </p>
        </div>
        <a className="brutal-link footer-link" href="https://buymeacoffee.com/malaviya" target="_blank" rel="noreferrer">
          Support Me Here
        </a>
      </footer>
    </main>
  );
}



