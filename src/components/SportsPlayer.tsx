import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Radio,
  Tv,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StreamMirror } from '../../server/sports/types';

interface SportsPlayerProps {
  title: string;
  subtitle?: string;
  streams: StreamMirror[];
  currentMirrorIndex: number;
  onSelectMirror: (index: number) => void;
  onClose: () => void;
}

export const SportsPlayer: React.FC<SportsPlayerProps> = ({
  title,
  subtitle,
  streams,
  currentMirrorIndex,
  onSelectMirror,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  // Active stream and url resolution
  const activeStream = streams[currentMirrorIndex] || streams[0];
  const rawUrl = activeStream?.url || activeStream?.embedUrl || '';

  // Determine if direct HLS
  const isDirectHls = rawUrl.includes('.m3u8') || activeStream?.type === 'hls';

  // Apply server-side proxy for HLS to bypass CORS & Referrer blocks
  const effectiveUrl =
    isDirectHls && rawUrl.startsWith('http') && !rawUrl.includes('/api/sports/stream/proxy')
      ? `/api/sports/stream/proxy?url=${encodeURIComponent(rawUrl)}`
      : rawUrl;

  // Engine mode: 'video' (HLS / HTML5) or 'iframe'
  const [engineMode, setEngineMode] = useState<'video' | 'iframe'>(isDirectHls ? 'video' : 'iframe');

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Autoplay policy default
  const [volume, setVolume] = useState<number>(0.75);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Auto-switch mode based on stream
  useEffect(() => {
    setEngineMode(isDirectHls ? 'video' : 'iframe');
    setIsLoading(true);
    setHasError(false);
  }, [isDirectHls, currentMirrorIndex]);

  // Hls.js Pipeline initialization with auto-recovery and continuous playback
  useEffect(() => {
    if (engineMode !== 'video' || !effectiveUrl) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Destroy any prior HLS instance
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    setIsLoading(true);
    setHasError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Ensures smoother non-stop buffering for live streams
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        fragLoadingMaxRetry: 8,
        manifestLoadingMaxRetry: 8,
        levelLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
      });

      hls.loadSource(effectiveUrl);
      hls.attachMedia(videoEl);
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasError(false);
        videoEl.muted = isMuted;
        videoEl.play().catch(() => {
          // Autoplay muted fallback if browser enforces user gesture
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => {});
        });
      });

      // Continuous playback recovery on any error
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Try restart once
              hls.destroy();
              hlsInstanceRef.current = null;
              setHasError(true);
              break;
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS Native HLS
      videoEl.src = effectiveUrl;
      videoEl.muted = isMuted;
      videoEl.play().catch(() => {
        videoEl.muted = true;
        setIsMuted(true);
        videoEl.play().catch(() => {});
      });
      setIsLoading(false);
    } else {
      setEngineMode('iframe');
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [engineMode, effectiveUrl, isMuted]);

  // Video event handlers
  const handlePlaying = () => {
    setIsPlaying(true);
    setIsLoading(false);
    setHasError(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  // Sound toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && videoRef.current.volume === 0) {
      videoRef.current.volume = 0.75;
      setVolume(0.75);
    }
  };

  // Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0 && videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Auto-next server helper
  const handleNextServer = () => {
    const nextIndex = (currentMirrorIndex + 1) % streams.length;
    onSelectMirror(nextIndex);
  };

  // Reload current stream
  const handleReload = () => {
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.startLoad();
    }
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 border border-slate-800 rounded-none sm:rounded-3xl w-full max-w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in"
    >
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800/90 flex items-center justify-between shrink-0 gap-3 z-30">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            DIRECT HD
          </span>
          <div className="overflow-hidden">
            <h3 className="text-white font-black text-sm sm:text-base truncate tracking-tight">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Engine Switch & Close */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mute Unmute fast badge on mobile */}
          {isMuted && (
            <button
              onClick={toggleMute}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] transition-all cursor-pointer shadow-md shadow-amber-500/20"
              title="Cliquer pour activer le son"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Activer le Son</span>
            </button>
          )}

          {/* Engine Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setEngineMode('video')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                engineMode === 'video'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vidéo HD
            </button>
            <button
              onClick={() => setEngineMode('iframe')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                engineMode === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iframe
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. ADAPTIVE RESPONSIVE VIDEO SCREEN */}
      <div className="relative flex-1 sm:flex-none aspect-video w-full bg-black overflow-hidden flex items-center justify-center group select-none">
        {engineMode === 'video' ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            controls={false}
            onPlaying={handlePlaying}
            onPause={handlePause}
            onWaiting={handleWaiting}
            onCanPlay={handleCanPlay}
            onError={handleError}
          />
        ) : (
          <iframe
            key={`${effectiveUrl}_${currentMirrorIndex}`}
            src={effectiveUrl}
            referrerPolicy="no-referrer"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-downloads"
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => setHasError(true)}
          />
        )}

        {/* LOADING SPINNER OVERLAY */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-white text-xs font-bold tracking-wide">Chargement du flux en direct...</span>
          </div>
        )}

        {/* ERROR RECOVERY BANNER (NON-BLOCKING) */}
        {hasError && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-extrabold text-sm">Signal temporairement indisponible</h4>
              <p className="text-slate-400 text-xs">Passez au serveur suivant pour continuer la lecture sans interruption.</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleNextServer}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
              >
                Passer au Serveur Suivant
              </button>
              <button
                onClick={handleReload}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* MODERN TOUCH & HOVER VIDEO CONTROLS BAR */}
        {engineMode === 'video' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 sm:p-4 flex items-center justify-between text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="hidden sm:block w-20 sm:w-24 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Live Status Badge */}
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span className="hidden sm:inline">DIRECT</span>
                <span className="text-[11px] font-mono text-slate-300">({activeStream?.quality || '1080p'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Reload */}
              <button
                onClick={handleReload}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-slate-300 hover:text-white"
                title="Rafraîchir le flux"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                title="Plein écran"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. RESPONSIVE SERVER SELECTOR BAR */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">SERVEURS :</span>
          {streams.map((s, idx) => (
            <button
              key={s.id || idx}
              onClick={() => onSelectMirror(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentMirrorIndex === idx
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{s.name || `Serveur ${idx + 1}`}</span>
              <span className="text-[10px] opacity-75 font-mono">({s.quality})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plein Écran Externe</span>
          </a>
        </div>
      </div>
    </div>
  );
};
