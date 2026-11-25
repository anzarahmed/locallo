import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data: number;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
        onStateChange?: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';
const PLAYER_STATE = { ENDED: 0, PLAYING: 1 };

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

interface Props {
  videoId: string;
  title: string;
}

export default function LockedYouTubePlayer({ videoId, title }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const seekingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const wrapper = mountRef.current;
    if (!wrapper) return;

    loadYouTubeApi().then(() => {
      if (cancelled || !wrapper.isConnected || !window.YT?.Player) return;

      const host = document.createElement('div');
      host.style.width = '100%';
      host.style.height = '100%';
      wrapper.appendChild(host);

      const player = new window.YT.Player(host, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          controls: 0,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setReady(true);
            setDuration(event.target.getDuration());
            setIsMuted(event.target.isMuted());
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setIsPlaying(event.data === PLAYER_STATE.PLAYING);
            if (event.data === PLAYER_STATE.ENDED) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          /* player already torn down */
        }
      }
      wrapper.replaceChildren();
      setReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsMuted(false);
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      if (!seekingRef.current) setCurrentTime(player.getCurrentTime());
      const nextDuration = player.getDuration();
      if (Number.isFinite(nextDuration)) setDuration(nextDuration);
      setIsMuted(player.isMuted());
    }, 250);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    function handleFullscreenChange(): void {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  function togglePlay(): void {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  }

  function handleSeekChange(event: ChangeEvent<HTMLInputElement>): void {
    const value = Number(event.target.value);
    setCurrentTime(value);
    playerRef.current?.seekTo(value, true);
  }

  function toggleMute(): void {
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) player.unMute();
    else player.mute();
    setIsMuted(!isMuted);
  }

  function toggleFullscreen(): void {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void element.requestFullscreen().catch(() => undefined);
    }
  }

  const controlClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
    >
      <div
        ref={mountRef}
        title={title}
        className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
      />
      <div aria-hidden="true" className="absolute inset-0 z-10 cursor-default" />
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2 pt-8 text-white">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className={controlClass}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-white/80">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeekChange}
          onPointerDown={() => {
            seekingRef.current = true;
          }}
          onPointerUp={() => {
            seekingRef.current = false;
          }}
          onBlur={() => {
            seekingRef.current = false;
          }}
          aria-label="Seek video"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 accent-teal-400"
        />
        <span className="w-10 text-xs tabular-nums text-white/80">{formatTime(duration)}</span>
        <button
          type="button"
          onClick={toggleMute}
          disabled={!ready}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className={controlClass}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          disabled={!ready}
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          className={controlClass}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}
