import { useState } from 'react';
import Hero from './components/Hero';
import VideoPlayer from './components/VideoPlayer';
import type { VideoData } from './types';
import './App.css';

function App() {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async (url: string) => {
    setLoading(true);
    setError(null);
    setVideoData(null);

    try {
      const res = await fetch(
        `http://localhost:3001/api/terabox?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();

      if (!data.success || !data.data?.list?.length) {
        throw new Error(data.error || 'No video found at this link.');
      }

      setVideoData(data.data.list[0]);
    } catch (e: unknown) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="bg-video-wrap">
        <video
          className="bg-video"
          src="https://media.venice.ai/assets/lp/video/light-waves.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="bg-overlay" />
        <div className="bg-grain" />
      </div>

      <div className="content">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">AnshAPI</span>
            <span className="logo-tag">TeraStream</span>
          </div>
          <a
            className="nav-link"
            href="https://ansh-apis.is-dev.org"
            target="_blank"
            rel="noreferrer"
          >
            API Docs ↗
          </a>
        </header>

        <main>
          <Hero onFetch={handleFetch} loading={loading} error={error} />
          {videoData && <VideoPlayer data={videoData} />}
        </main>

        <footer className="footer">
          <p>Powered by <strong>AnshAPI</strong> · TeraBox Streaming Platform · Built with ❤</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
