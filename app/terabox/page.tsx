"use client";

import Link from "next/link";
import { useState } from "react";
import { TeraboxHero } from "@/components/terabox/TeraboxHero";
import { TeraboxVideoPlayer } from "@/components/terabox/TeraboxVideoPlayer";
import type { TeraboxApiResponse, VideoData } from "@/components/terabox/types";
import "./terabox.css";

export default function TeraboxPage() {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideoData(null);

    try {
      const response = await fetch(`/api/terabox?url=${encodeURIComponent(url)}`, {
        method: "GET",
        cache: "no-store"
      });

      const data = (await response.json().catch(() => null)) as TeraboxApiResponse | null;

      if (!response.ok || !data?.success || !data.data?.list?.length) {
        throw new Error(
          data?.error || data?.message || "No video found at this link."
        );
      }

      setVideoData(data.data.list[0]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tb-app">
      <div className="tb-bg-video-wrap">
        <video
          className="tb-bg-video"
          src="https://media.venice.ai/assets/lp/video/light-waves.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="tb-bg-overlay" />
        <div className="tb-bg-grain" />
      </div>

      <div className="tb-content">
        <header className="tb-header">
          <div className="tb-logo">
            <span className="tb-logo-icon">◈</span>
            <span className="tb-logo-text">Malaviya AI</span>
            <span className="tb-logo-tag">TeraStream</span>
          </div>
          <Link className="tb-nav-link" href="/">
            ← Back to Studio
          </Link>
        </header>

        <main className="tb-main">
          <TeraboxHero onFetch={handleFetch} loading={loading} error={error} />
          {videoData ? <TeraboxVideoPlayer data={videoData} /> : null}
        </main>

        <footer className="tb-footer">
          <p>
            Powered by <strong>AnshAPI</strong> · TeraBox Streaming · Built into Malaviya AI Studio
          </p>
        </footer>
      </div>
    </div>
  );
}
