import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import type { VideoData } from '../types';
import './VideoPlayer.css';

interface Props {
  data: VideoData;
}

type Quality = '360p' | '480p' | '720p';

export default function VideoPlayer({ data }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<Quality>('720p');
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const availableQualities = Object.keys(data.fast_stream_url) as Quality[];
  const src = data.fast_stream_url[quality] || data.fast_stream_url['480p'] || data.fast_stream_url['360p'];

  useEffect(() => {
    // Set best available quality on load
    if (data.fast_stream_url['720p']) setQuality('720p');
    else if (data.fast_stream_url['480p']) setQuality('480p');
    else setQuality('360p');
  }, [data.fast_stream_url]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !muted;
    setMuted(next);
    videoRef.current.muted = next;
  };

  const handleQualityChange = (q: Quality) => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const wasPlaying = !v.paused;
    setQuality(q);
    requestAnimationFrame(() => {
      if (v) {
        v.currentTime = t;
        if (wasPlaying) v.play();
      }
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const showControlsTemp = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="player-section" style={{ animation: 'fadeUp 0.7s ease both' }}>
      <div className="player-meta">
        <div className="meta-name">
          <span className="meta-icon">▶</span>
          {data.name.replace(/\.[^.]+$/, '').replace(/Tg @\S+\s*/gi, '')}
        </div>
        <div className="meta-info">
          <span>{data.duration}</span>
          <span className="dot">·</span>
          <span>{data.size_formatted}</span>
          <span className="dot">·</span>
          <span className="quality-badge">{quality}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`player-wrap ${showControls ? 'controls-visible' : ''}`}
        onMouseMove={showControlsTemp}
        onMouseLeave={() => playing && setShowControls(false)}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          className="video-el"
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
          playsInline
        />

        {/* Play/Pause overlay */}
        {!playing && (
          <div className="play-overlay" onClick={togglePlay}>
            <div className="play-circle">▶</div>
          </div>
        )}

        {/* Controls */}
        <div className="controls" onClick={e => e.stopPropagation()}>
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
              <div className="progress-dot" style={{ left: `${pct}%` }} />
            </div>
            <input
              type="range"
              className="progress-input"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
            />
          </div>

          <div className="controls-row">
            <div className="controls-left">
              <button className="ctrl-btn" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
                {playing ? '⏸' : '▶'}
              </button>
              <div className="volume-wrap">
                <button className="ctrl-btn" onClick={toggleMute} title="Mute">
                  {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                />
              </div>
              <span className="time-display">{fmt(currentTime)} / {fmt(duration)}</span>
            </div>

            <div className="controls-right">
              <div className="quality-switcher">
                {availableQualities.map(q => (
                  <button
                    key={q}
                    className={`qual-btn ${quality === q ? 'active' : ''}`}
                    onClick={() => handleQualityChange(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button className="ctrl-btn" onClick={toggleFullscreen} title="Fullscreen">
                {fullscreen ? '⊡' : '⛶'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="download-bar">
        <span className="dl-label">Download Video</span>
        <div className="dl-buttons">
          <a href={data.normal_dlink} className="dl-btn primary" target="_blank" rel="noreferrer" download>
            <span>⬇</span> MP4 Download
          </a>
          {data.zip_dlink && (
            <a href={data.zip_dlink} className="dl-btn secondary" target="_blank" rel="noreferrer" download>
              <span>⬇</span> ZIP Download
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
