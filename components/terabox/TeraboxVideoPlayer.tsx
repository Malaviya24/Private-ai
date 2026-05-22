"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { VideoData } from "./types";

interface Props {
  data: VideoData;
}

type Quality = "360p" | "480p" | "720p";

export function TeraboxVideoPlayer({ data }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<Quality>("720p");
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const availableQualities = Object.keys(data.fast_stream_url) as Quality[];
  const src =
    data.fast_stream_url[quality] ||
    data.fast_stream_url["480p"] ||
    data.fast_stream_url["360p"];

  useEffect(() => {
    if (data.fast_stream_url["720p"]) setQuality("720p");
    else if (data.fast_stream_url["480p"]) setQuality("480p");
    else setQuality("360p");
  }, [data.fast_stream_url]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(event.target.value);
    if (videoRef.current) videoRef.current.currentTime = next;
    setCurrentTime(next);
  };

  const handleVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(event.target.value);
    setVolume(next);
    if (videoRef.current) videoRef.current.volume = next;
    setMuted(next === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !muted;
    setMuted(next);
    videoRef.current.muted = next;
  };

  const handleQualityChange = (next: Quality) => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    const wasPlaying = !video.paused;
    setQuality(next);
    requestAnimationFrame(() => {
      if (video) {
        video.currentTime = time;
        if (wasPlaying) void video.play();
      }
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      void document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const showControlsTemp = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  const fmt = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="tb-player-section">
      <div className="tb-player-meta">
        <div className="tb-meta-name">
          <span className="tb-meta-icon">▶</span>
          {data.name.replace(/\.[^.]+$/, "").replace(/Tg @\S+\s*/gi, "")}
        </div>
        <div className="tb-meta-info">
          <span>{data.duration}</span>
          <span className="tb-dot">·</span>
          <span>{data.size_formatted}</span>
          <span className="tb-dot">·</span>
          <span className="tb-quality-badge">{quality}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`tb-player-wrap ${showControls ? "tb-controls-visible" : ""}`}
        onMouseMove={showControlsTemp}
        onMouseLeave={() => playing && setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          className="tb-video-el"
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
          playsInline
        />

        {!playing && (
          <div className="tb-play-overlay" onClick={togglePlay}>
            <div className="tb-play-circle">▶</div>
          </div>
        )}

        <div className="tb-controls" onClick={(event) => event.stopPropagation()}>
          <div className="tb-progress-wrap">
            <div className="tb-progress-bar">
              <div className="tb-progress-fill" style={{ width: `${pct}%` }} />
              <div className="tb-progress-dot" style={{ left: `${pct}%` }} />
            </div>
            <input
              type="range"
              className="tb-progress-input"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
            />
          </div>

          <div className="tb-controls-row">
            <div className="tb-controls-left">
              <button
                className="tb-ctrl-btn"
                onClick={togglePlay}
                title={playing ? "Pause" : "Play"}
                type="button"
              >
                {playing ? "⏸" : "▶"}
              </button>
              <div className="tb-volume-wrap">
                <button
                  className="tb-ctrl-btn"
                  onClick={toggleMute}
                  title="Mute"
                  type="button"
                >
                  {muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </button>
                <input
                  type="range"
                  className="tb-volume-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                />
              </div>
              <span className="tb-time-display">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>

            <div className="tb-controls-right">
              <div className="tb-quality-switcher">
                {availableQualities.map((option) => (
                  <button
                    key={option}
                    className={`tb-qual-btn ${quality === option ? "tb-active" : ""}`}
                    onClick={() => handleQualityChange(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                className="tb-ctrl-btn"
                onClick={toggleFullscreen}
                title="Fullscreen"
                type="button"
              >
                {fullscreen ? "⊡" : "⛶"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tb-download-bar">
        <span className="tb-dl-label">Download Video</span>
        <div className="tb-dl-buttons">
          <a
            href={data.normal_dlink}
            className="tb-dl-btn tb-primary"
            target="_blank"
            rel="noreferrer"
            download
          >
            <span>⬇</span> MP4 Download
          </a>
          {data.zip_dlink ? (
            <a
              href={data.zip_dlink}
              className="tb-dl-btn tb-secondary"
              target="_blank"
              rel="noreferrer"
              download
            >
              <span>⬇</span> ZIP Download
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
