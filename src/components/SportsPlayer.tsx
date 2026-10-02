import React, { useEffect, useRef, useState } from 'react';
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
  AlertCircle,
  Activity,
  Flame,
  Shield,
  Clock
} from 'lucide-react';
import { SportsMatch, StreamMirror } from '../../server/sports/types';

interface SportsPlayerProps {
  title: string;
  subtitle?: string;
  match?: SportsMatch;
  streams: StreamMirror[];
  currentMirrorIndex: number;
  onSelectMirror: (index: number) => void;
  onClose: () => void;
}

export const SportsPlayer: React.FC<SportsPlayerProps> = ({
  title,
  subtitle,
  match,
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

  // Determine stream type
  const isTracker = activeStream?.type === 'web' || rawUrl.startsWith('interactive://');
  const isDirectHls = (rawUrl.includes('.m3u8') || activeStream?.type === 'hls') && !isTracker;

  // Apply server-side proxy for HLS to bypass CORS & Referrer blocks
  const effectiveUrl =
    isDirectHls && rawUrl.startsWith('http') && !rawUrl.includes('/api/sports/stream/proxy')
      ? `/api/sports/stream/proxy?url=${encodeURIComponent(rawUrl)}`
      : rawUrl;

  // Engine mode: 'video' | 'iframe' | 'tracker'
  const [engineMode, setEngineMode] = useState<'video' | 'iframe' | 'tracker'>(
    isTracker ? 'tracker' : isDirectHls ? 'video' : 'iframe'
  );

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.75);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Simulated 2D match action animation
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 50 });
  const [actionText, setActionText] = useState<string>('Construction au milieu de terrain');
  const [actionType, setActionType] = useState<'attack' | 'danger' | 'shot' | 'corner' | 'defend'>('attack');

  // Auto-switch engine when mirror changes
  useEffect(() => {
    if (isTracker) {
      setEngineMode('tracker');
    } else if (isDirectHls) {
      setEngineMode('video');
    } else {
      setEngineMode('iframe');
    }
    setIsLoading(false);
    setHasError(false);
  }, [isTracker, isDirectHls, currentMirrorIndex]);

  // Periodic 2D pitch action generator for real live feel
  useEffect(() => {
    if (engineMode !== 'tracker') return;

    const actions = [
      { text: 'Attaque dangereuse dans l’axe', type: 'danger' as const, x: 72, y: 48 },
      { text: 'Corner tiré au second poteau', type: 'corner' as const, x: 88, y: 15 },
      { text: 'Tir cadré repoussé par le gardien', type: 'shot' as const, x: 84, y: 50 },
      { text: 'Contre-attaque rapide sur l’aile', type: 'attack' as const, x: 65, y: 78 },
      { text: 'Récupération défensive solide', type: 'defend' as const, x: 30, y: 52 },
      { text: 'Possession et passe en retrait', type: 'attack' as const, x: 48, y: 40 },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % actions.length;
      const act = actions[idx];
      setBallPosition({ x: act.x + (Math.random() * 6 - 3), y: act.y + (Math.random() * 6 - 3) });
      setActionText(act.text);
      setActionType(act.type);
    }, 3800);

    return () => clearInterval(interval);
  }, [engineMode]);

  // Hls.js Pipeline initialization
  useEffect(() => {
    if (engineMode !== 'video' || !effectiveUrl || isTracker) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    setIsLoading(true);
    setHasError(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        fragLoadingMaxRetry: 8,
        manifestLoadingMaxRetry: 8,
      });

      hls.loadSource(effectiveUrl);
      hls.attachMedia(videoEl);
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasError(false);
        videoEl.muted = isMuted;
        videoEl.play().catch(() => {
          videoEl.muted = true;
          setIsMuted(true);
          videoEl.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setHasError(true);
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = effectiveUrl;
      videoEl.muted = isMuted;
      videoEl.play().catch(() => {});
      setIsLoading(false);
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [engineMode, effectiveUrl, isTracker, isMuted]);

  // Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
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
            DIRECT
          </span>
          <div className="overflow-hidden">
            <h3 className="text-white font-black text-sm sm:text-base truncate tracking-tight">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs truncate">{subtitle}</p>}
          </div>
        </div>

        {/* View mode buttons & Close */}
        <div className="flex items-center gap-2 shrink-0">
          {match && (
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700/80">
              <button
                onClick={() => {
                  setEngineMode('iframe');
                  onSelectMirror(0); // Switch to match video
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  engineMode !== 'tracker'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Regarder la diffusion vidéo directe du match"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vidéo du Match</span>
              </button>
              <button
                onClick={() => {
                  setEngineMode('tracker');
                  onSelectMirror(1); // Switch to 2D tracker
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  engineMode === 'tracker'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Afficher le terrain 2D interactif et radar de match"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Terrain 2D Live</span>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. PLAYER DISPLAY SCREEN (VIDEO, IFRAME, OR 2D INTERACTIVE PITCH) */}
      <div className="relative flex-1 sm:flex-none aspect-video w-full bg-black overflow-hidden flex items-center justify-center group select-none">
        {/* MODE 1: 2D INTERACTIVE MATCH TRACKER & RADAR */}
        {engineMode === 'tracker' && match ? (
          <div className="w-full h-full bg-gradient-to-b from-slate-950 via-emerald-950/60 to-slate-950 flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden select-none">
            {/* Live Match Top Scoreboard */}
            <div className="flex items-center justify-between bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2.5 z-20 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.displayName}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                  onError={(e) => { (e.target as any).src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'; }}
                />
                <span className="text-white font-black text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[160px]">
                  {match.homeTeam.displayName}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white">{match.homeTeam.score}</span>
                  <span className="text-slate-500 font-bold">-</span>
                  <span className="text-xl sm:text-2xl font-black text-white">{match.awayTeam.score}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  <Clock className="w-3 h-3 animate-spin text-rose-500" />
                  <span>{match.statusDetail || match.clock || 'En Direct'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-white font-black text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[160px] text-right">
                  {match.awayTeam.displayName}
                </span>
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.displayName}
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                  onError={(e) => { (e.target as any).src = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png'; }}
                />
              </div>
            </div>

            {/* 2D Football Stadium Pitch Graphic */}
            <div className="relative flex-1 my-2 border-2 border-emerald-400/40 rounded-2xl bg-gradient-to-r from-emerald-900/60 via-green-800/60 to-emerald-900/60 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Pitch Markings */}
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-emerald-300/40 -translate-x-1/2" />
              <div className="absolute w-24 h-24 border-2 border-emerald-300/40 rounded-full" />
              <div className="absolute w-2 h-2 bg-emerald-300 rounded-full" />
              {/* Penalty boxes */}
              <div className="absolute left-0 inset-y-[20%] w-20 sm:w-28 border-r-2 border-y-2 border-emerald-300/40 rounded-r-xl" />
              <div className="absolute right-0 inset-y-[20%] w-20 sm:w-28 border-l-2 border-y-2 border-emerald-300/40 rounded-l-xl" />

              {/* Animated Live Ball */}
              <div
                className="absolute w-5 h-5 rounded-full bg-white shadow-xl shadow-amber-400/50 flex items-center justify-center transition-all duration-700 ease-out z-10"
                style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
              >
                <div className="w-2 h-2 rounded-full bg-slate-900" />
              </div>

              {/* Live Action Banner Floating in Pitch */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-400/50 flex items-center gap-2 shadow-xl z-20">
                {actionType === 'shot' ? (
                  <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                ) : actionType === 'danger' ? (
                  <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                ) : actionType === 'defend' ? (
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                )}
                <span className="text-white text-[11px] font-bold">{actionText}</span>
              </div>
            </div>

            {/* Live Stats Bar */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-bold text-center shrink-0">
              <div>
                <span className="text-slate-400 text-[10px] block">POSSESSION</span>
                <span className="text-emerald-400 font-black">54% - 46%</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">TIRS (CADRÉS)</span>
                <span className="text-sky-300 font-black">11 (5) - 8 (3)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">FAUTES / CARTO</span>
                <span className="text-amber-400 font-black">9 (2) - 12 (1)</span>
              </div>
            </div>
          </div>
        ) : engineMode === 'video' ? (
          /* MODE 2: DIRECT VIDEO HLS (FOR TV CHANNELS) */
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            controls={false}
            onPlaying={() => { setIsPlaying(true); setIsLoading(false); }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onError={() => { setIsLoading(false); setHasError(true); }}
          />
        ) : (
          /* MODE 3: EXACT MATCH EMBED PLAYER (YOUTUBE NOCOOKIE MATCH STREAM) */
          <iframe
            key={`${effectiveUrl}_${currentMirrorIndex}`}
            src={effectiveUrl}
            referrerPolicy="no-referrer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => setHasError(true)}
          />
        )}

        {/* LOADING SPINNER OVERLAY */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-white text-xs font-bold tracking-wide">Chargement de la diffusion...</span>
          </div>
        )}

        {/* ERROR RECOVERY BANNER */}
        {hasError && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-extrabold text-sm">Signal en cours d'initialisation</h4>
              <p className="text-slate-400 text-xs">Passez sur le miroir suivant ou activez le Terrain 2D Live.</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onSelectMirror((currentMirrorIndex + 1) % streams.length)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
              >
                Serveur Suivant
              </button>
            </div>
          </div>
        )}

        {/* VIDEO CONTROLS FOR VIDEO MODE */}
        {engineMode === 'video' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 sm:p-4 flex items-center justify-between text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) {
                      videoRef.current.volume = val;
                      videoRef.current.muted = false;
                      setIsMuted(false);
                    }
                  }}
                  className="hidden sm:block w-20 sm:w-24 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>DIRECT ({activeStream?.quality || 'HD'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MIRRORS & SERVER SELECTOR */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">SOURCES DISPONIBLES :</span>
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
              <span>{s.name || `Source ${idx + 1}`}</span>
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
            <span className="hidden sm:inline">Plein Écran Dédié</span>
          </a>
        </div>
      </div>
    </div>
  );
};
