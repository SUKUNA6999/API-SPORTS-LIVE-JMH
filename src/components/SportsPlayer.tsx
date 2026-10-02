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
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tv,
  Globe,
  Radio,
  Share2,
} from 'lucide-react';
import { StreamMirror } from '../../server/sports/types';

interface ProbeResult {
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  contentType: string;
  isHls: boolean;
  isFrameRestricted: boolean;
  frameOptions: string | null;
  recommendation: string;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'network';
  message: string;
}

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  // Active stream from mirrors
  const activeStream = streams[currentMirrorIndex] || streams[0];
  const streamUrl = activeStream?.url || activeStream?.embedUrl || '';

  // Mode engine: 'video' (HLS / Native HTML5) or 'iframe'
  const isDirectHls = streamUrl.includes('.m3u8') || activeStream?.type === 'hls';
  const [engineMode, setEngineMode] = useState<'video' | 'iframe'>(isDirectHls ? 'video' : 'iframe');

  // Player playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true); // Autoplay policy safety
  const [volume, setVolume] = useState<number>(0.6);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);

  // Black screen & diagnostics
  const [blackScreenDetected, setBlackScreenDetected] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [
      ...prev.slice(-40), // Keep last 40 logs
      {
        id: Math.random().toString(36).substring(2, 9),
        time: timeStr,
        type,
        message,
      },
    ]);
  }, []);

  // Probe server & network health
  const probeStream = useCallback(async (targetUrl: string) => {
    if (!targetUrl || !targetUrl.startsWith('http')) {
      addLog('warn', `URL locale ou embed interne: ${targetUrl}`);
      setProbeResult({
        ok: true,
        status: 200,
        statusText: 'Local Internal Stream',
        latencyMs: 12,
        contentType: 'text/html',
        isHls: targetUrl.includes('.m3u8'),
        isFrameRestricted: false,
        frameOptions: null,
        recommendation: 'iframe',
      });
      return;
    }

    setProbing(true);
    addLog('network', `[PROBE] Test de connectivité vers : ${targetUrl.substring(0, 60)}...`);

    try {
      const res = await fetch(`/api/sports/stream/probe?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProbeResult = await res.json();
      setProbeResult(data);

      if (data.ok) {
        addLog(
          'success',
          `[PROBE OK] Réponse HTTP ${data.status} • Latence ${data.latencyMs}ms • Type: ${data.contentType || 'unknown'}`
        );
        if (data.isFrameRestricted) {
          addLog('warn', `[AVERTISSEMENT] Le serveur source restreint l'iframe (X-Frame-Options: ${data.frameOptions || 'DENY'}).`);
        }
      } else {
        addLog(
          'error',
          `[PROBE ÉCHEC] Le serveur source ne répond pas (${data.statusText || 'Inaccessible'}). Écran noir possible.`
        );
      }
    } catch (err: any) {
      addLog('error', `[PROBE ERREUR] Impossible de sonder le serveur distant: ${err.message}`);
    } finally {
      setProbing(false);
    }
  }, [addLog]);

  // Sync mode when stream changes
  useEffect(() => {
    const isHls = streamUrl.includes('.m3u8') || activeStream?.type === 'hls';
    setEngineMode(isHls ? 'video' : 'iframe');
    setBlackScreenDetected(false);
    setHasStartedPlaying(false);

    addLog('info', `=== Changement de flux: [${activeStream?.name || 'Miroir'}] ===`);
    addLog('info', `URL: ${streamUrl}`);
    addLog('info', `Moteur sélectionné: ${isHls ? 'Lecteur Vidéo HLS Natif (hls.js)' : 'Lecteur Iframe Universel'}`);

    probeStream(streamUrl);
  }, [streamUrl, activeStream, probeStream, addLog]);

  // Video Tag & Hls.js setup
  useEffect(() => {
    if (engineMode !== 'video' || !streamUrl) return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Cleanup existing HLS instance
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    addLog('info', `Initialisation du pipeline HLS pour ${streamUrl.substring(0, 50)}...`);

    if (Hls.isSupported()) {
      addLog('info', 'Moteur Hls.js supporté par le navigateur. Création du flux média...');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoEl);
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        addLog('success', `Manifeste HLS validé ! ${data.levels.length} niveau(x) de résolution détecté(s).`);
        videoEl.muted = isMuted;
        videoEl.play().catch((e) => {
          addLog('warn', `Lecture automatique bloquée par le navigateur: ${e.message} (Cliquez sur Lecture)`);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          addLog('error', `Erreur HLS fatale: ${data.type} - ${data.details}`);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              addLog('warn', 'Erreur réseau: tentative de reconnexion au flux...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              addLog('warn', 'Erreur de décodage média: tentative de reprise...');
              hls.recoverMediaError();
              break;
            default:
              setBlackScreenDetected(true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      addLog('info', 'Lecture HLS native (Safari / iOS / macOS)...');
      videoEl.src = streamUrl;
      videoEl.muted = isMuted;
      videoEl.play().catch((e) => {
        addLog('warn', `Lecture bloquée: ${e.message}`);
      });
    } else {
      addLog('error', 'Votre navigateur ne supporte pas la lecture HLS directe.');
      setBlackScreenDetected(true);
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [engineMode, streamUrl, isMuted, addLog]);

  // Monitor playback progress to flag black screens
  useEffect(() => {
    setBlackScreenDetected(false);
    setHasStartedPlaying(false);

    // Timeout: if no video play / progress after 6 seconds, warn user
    const timer = setTimeout(() => {
      if (!hasStartedPlaying) {
        setBlackScreenDetected(true);
        addLog('warn', '[ALERTE ÉCRAN NOIR] Aucun signal vidéo reçu après 6s. Veuillez changer de miroir ou ouvrir en onglet.');
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [streamUrl, currentMirrorIndex, hasStartedPlaying, addLog]);

  // Video element events
  const handleVideoPlaying = () => {
    setIsPlaying(true);
    setHasStartedPlaying(true);
    setBlackScreenDetected(false);
    addLog('success', '▶ Lecture en cours active (Flux vidéo synchronisé)');
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    addLog('info', '⏸ Lecture en pause');
  };

  const handleVideoWaiting = () => {
    addLog('warn', '⏳ Mise en mémoire tampon (Buffering du flux en cours)...');
  };

  const handleVideoError = () => {
    setBlackScreenDetected(true);
    addLog('error', '❌ Échec de lecture vidéo. Le flux est indisponible ou bloqué par CORS.');
  };

  // Iframe events
  const handleIframeLoad = () => {
    setHasStartedPlaying(true);
    addLog('success', '🌐 Iframe chargée avec succès par le navigateur.');
  };

  const handleIframeError = () => {
    setBlackScreenDetected(true);
    addLog('error', '❌ Erreur de chargement dans l’iframe (Blocage X-Frame-Options ou DNS).');
  };

  // Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((e) => addLog('error', `Lecture impossible: ${e.message}`));
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMute = !videoRef.current.muted;
    videoRef.current.muted = newMute;
    setIsMuted(newMute);
    addLog('info', newMute ? 'Son coupé (Muet)' : 'Son activé');
  };

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

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleCopyLogs = () => {
    const logText = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleNextMirror = () => {
    const nextIdx = (currentMirrorIndex + 1) % streams.length;
    addLog('info', `Bascule manuelle vers le serveur ${nextIdx + 1}...`);
    onSelectMirror(nextIdx);
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in"
    >
      {/* 1. PLAYER HEADER BAR */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            DIRECT HD
          </span>
          <div className="overflow-hidden">
            <h3 className="text-white font-extrabold text-sm sm:text-base truncate">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Status indicator & Engine Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono">
            {probing ? (
              <span className="flex items-center gap-1 text-amber-300">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Test réseau...</span>
              </span>
            ) : probeResult?.ok ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>{probeResult.status} OK ({probeResult.latencyMs}ms)</span>
              </span>
            ) : probeResult ? (
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <XCircle className="w-3 h-3" />
                <span>Erreur {probeResult.status || 'Réseau'}</span>
              </span>
            ) : (
              <span className="text-slate-400">En attente</span>
            )}
          </div>

          {/* Engine toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setEngineMode('video');
                addLog('info', 'Changement manuel vers le Mode Vidéo HLS Natif');
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                engineMode === 'video'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Utiliser le lecteur vidéo HLS intégré"
            >
              Vidéo HLS
            </button>
            <button
              onClick={() => {
                setEngineMode('iframe');
                addLog('info', 'Changement manuel vers le Mode Iframe Universel');
              }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                engineMode === 'iframe'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Utiliser l'intégration iframe standard"
            >
              Iframe
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer le lecteur"
          >
            <span className="text-sm font-bold px-1">✕</span>
          </button>
        </div>
      </div>

      {/* 2. VIDEO / IFRAME DISPLAY AREA */}
      <div className="relative aspect-video bg-black w-full overflow-hidden flex items-center justify-center group">
        {engineMode === 'video' ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            controls={false}
            onPlaying={handleVideoPlaying}
            onPause={handleVideoPause}
            onWaiting={handleVideoWaiting}
            onError={handleVideoError}
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={`${streamUrl}_${currentMirrorIndex}`}
            src={streamUrl}
            referrerPolicy="no-referrer"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-downloads"
            className="w-full h-full border-0 bg-black"
            allowFullScreen
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}

        {/* BLACK SCREEN / SIGNAL LOST OVERLAY WRAPPER */}
        {blackScreenDetected && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="max-w-md space-y-1.5">
              <h4 className="text-white font-extrabold text-base">Aucun signal détecté sur ce miroir</h4>
              <p className="text-slate-300 text-xs">
                {probeResult?.isFrameRestricted
                  ? "Ce flux restreint l'intégration directe ou bloque l'iframe via X-Frame-Options."
                  : "Le serveur distant met trop de temps à répondre ou le flux nécessite un protocole spécifique."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={handleNextMirror}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Essayer le Serveur Suivant</span>
              </button>

              <button
                onClick={() => {
                  setEngineMode(engineMode === 'video' ? 'iframe' : 'video');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Basculer en Mode {engineMode === 'video' ? 'Iframe' : 'Vidéo HLS'}</span>
              </button>

              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white font-bold text-xs transition-colors border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir en Nouvel Onglet (Direct)</span>
              </a>
            </div>
          </div>
        )}

        {/* CUSTOM VIDEO OVERLAY CONTROLS (ONLY IN VIDEO MODE) */}
        {engineMode === 'video' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
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
                  className="w-16 sm:w-24 accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
                <span>DIRECT ({activeStream?.quality || 'HD 1080p'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => probeStream(streamUrl)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-slate-300 hover:text-white"
                title="Tester le réseau"
              >
                <Activity className={`w-4 h-4 ${probing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                title="Plein écran"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MIRROR SERVERS SELECTOR & ACTION BAR */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">SERVEURS DISPONIBLES :</span>
          {streams.map((s, idx) => (
            <button
              key={s.id || idx}
              onClick={() => onSelectMirror(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

        <div className="flex items-center gap-2 ml-auto">
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors border border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plein Écran Dédié</span>
          </a>
        </div>
      </div>

      {/* 4. REAL-TIME ERROR-HANDLING WRAPPER & CONSOLE LOGS DRAWER */}
      <div className="bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
        {/* Console Header Bar */}
        <div
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className="px-4 py-2 bg-slate-900/60 hover:bg-slate-900 border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono font-bold text-slate-200">Terminal & Console Logs Réseau (In-UI Error Wrapper)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
              {logs.length} logs
            </span>
          </div>

          <div className="flex items-center gap-3">
            {probeResult && (
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Code HTTP: <strong className={probeResult.ok ? 'text-emerald-400' : 'text-rose-400'}>{probeResult.status || 'ERR'}</strong> •
                Latence: <strong className="text-amber-400">{probeResult.latencyMs}ms</strong> •
                Format: <strong className="text-sky-300">{probeResult.isHls ? 'HLS Stream' : 'Web/Embed'}</strong>
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLogs();
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
              title="Copier tous les logs"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLogs ? 'Copié' : 'Copier'}</span>
            </button>
            {isConsoleOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Terminal Logs Window */}
        {isConsoleOpen && (
          <div className="p-3 bg-black/95 font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                <span
                  className={`shrink-0 font-bold ${
                    log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'network'
                      ? 'text-sky-400'
                      : 'text-slate-300'
                  }`}
                >
                  [{log.type.toUpperCase()}]
                </span>
                <span
                  className={`${
                    log.type === 'error'
                      ? 'text-rose-200'
                      : log.type === 'warn'
                      ? 'text-amber-200'
                      : log.type === 'success'
                      ? 'text-emerald-200'
                      : log.type === 'network'
                      ? 'text-sky-200'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
