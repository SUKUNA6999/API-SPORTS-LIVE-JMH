import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Flame,
  Calendar,
  Clock,
  Play,
  Tv,
  Star,
  Activity,
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Radio,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Maximize2,
  Share2,
  TrendingUp,
  Table as TableIcon,
  Key,
  Copy,
  Check,
  Code,
  Terminal,
  Sparkles,
  Globe,
  CalendarDays
} from 'lucide-react';
import {
  SportsMatch,
  TournamentLeague,
  TournamentStanding,
  SportsChannel,
  SportCategory,
  StreamMirror
} from '../../server/sports/types';
import { SportsApiKey } from '../../server/sports/keyService';
import { SportsD3Charts } from './SportsD3Charts';
import { SportsPlayer } from './SportsPlayer';

interface SportsArenaProps {
  initialSport?: string;
  initialLeague?: string;
  initialView?: 'matches' | 'live' | 'standings' | 'hub' | 'channels' | 'keys' | 'api';
}

export const SportsArena: React.FC<SportsArenaProps> = ({
  initialSport,
  initialLeague,
  initialView
}) => {
  // Views: matches | live | standings | hub | channels | keys
  const [activeView, setActiveView] = useState<'matches' | 'live' | 'standings' | 'hub' | 'channels' | 'keys'>(
    initialView === 'api' ? 'keys' : (initialView as any) || 'matches'
  );

  // Filters
  const [selectedSport, setSelectedSport] = useState<string>(initialSport || 'all');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(initialLeague || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [tournaments, setTournaments] = useState<TournamentLeague[]>([]);
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [standingsLeague, setStandingsLeague] = useState<string>('concacaf-nl');
  const [channels, setChannels] = useState<SportsChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Audio gentle chime alert state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousLiveCountRef = useRef(0);

  // Player Modal state
  const [activeModalMatch, setActiveModalMatch] = useState<SportsMatch | null>(null);
  const [activeModalChannel, setActiveModalChannel] = useState<SportsChannel | null>(null);
  const [activeMirrorIndex, setActiveMirrorIndex] = useState(0);

  // Auto-refresh interval (every 45 seconds)
  const [autoRefresh, setAutoRefresh] = useState(true);

  // API Keys state
  const [keysList, setKeysList] = useState<SportsApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyUsername, setNewKeyUsername] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'free' | 'pro' | 'unlimited'>('pro');
  const [createdKey, setCreatedKey] = useState<SportsApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Gentle, soft audio chime using Web Audio API (D5 -> A5 gentle chime)
  const playGentleChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  };

  // Load Tournaments & Channels
  useEffect(() => {
    fetch('/api/sports/tournaments')
      .then((res) => res.json())
      .then((data) => setTournaments(data.tournaments || []))
      .catch(console.error);

    fetch('/api/sports/channels')
      .then((res) => res.json())
      .then((data) => setChannels(data.channels || []))
      .catch(console.error);
  }, []);

  // Load Matches
  const loadMatches = () => {
    setLoading(true);
    let url = '/api/sports/matches';
    const params = new URLSearchParams();
    if (selectedLeagueId !== 'all') params.set('league', selectedLeagueId);
    if (selectedSport !== 'all') params.set('sport', selectedSport);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const fetchedMatches: SportsMatch[] = data.matches || [];
        setMatches(fetchedMatches);

        // Detect if new live matches started
        const liveNow = fetchedMatches.filter((m) => m.isLive).length;
        if (liveNow > previousLiveCountRef.current && liveNow > 0) {
          playGentleChime();
        }
        previousLiveCountRef.current = liveNow;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatches();
  }, [selectedLeagueId, selectedSport]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMatches();
    }, 45000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedLeagueId, selectedSport]);

  // Load Standings when standingsLeague changes
  useEffect(() => {
    if (activeView === 'standings' || activeView === 'hub') {
      setLoadingStandings(true);
      fetch(`/api/sports/standings/${standingsLeague}`)
        .then((res) => res.json())
        .then((data) => {
          setStandings(data.standings || []);
        })
        .catch(console.error)
        .finally(() => setLoadingStandings(false));
    }
  }, [activeView, standingsLeague]);

  // API Keys Fetch & Generate
  const fetchKeys = () => {
    setLoadingKeys(true);
    fetch('/api/sports/keys')
      .then((res) => res.json())
      .then((data) => setKeysList(data.keys || []))
      .catch(console.error)
      .finally(() => setLoadingKeys(false));
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sports/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newKeyLabel || 'Mon Application Sport Live',
          username: newKeyUsername || 'developpeur',
          tier: newKeyTier,
        }),
      });
      const data = await res.json();
      if (data.key) {
        setCreatedKey(data.key);
        setNewKeyLabel('');
        setNewKeyUsername('');
        fetchKeys();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  useEffect(() => {
    if (activeView === 'keys') {
      fetchKeys();
    }
  }, [activeView]);

  // Filtered matches by search & live view
  const displayMatches = matches.filter((m) => {
    if (activeView === 'live' && !m.isLive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.homeTeam.displayName.toLowerCase().includes(q) ||
        m.awayTeam.displayName.toLowerCase().includes(q) ||
        m.leagueName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const liveMatches = matches.filter((m) => m.isLive);
  const liveMatchesCount = liveMatches.length;

  // Group matches by Date (Aujourd'hui, Demain, etc.)
  const groupedMatches = displayMatches.reduce((groups: Record<string, SportsMatch[]>, match) => {
    const d = new Date(match.date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    let dateLabel = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (d.toDateString() === today.toDateString()) {
      dateLabel = `Aujourd'hui — ${dateLabel}`;
    } else if (d.toDateString() === tomorrow.toDateString()) {
      dateLabel = `Demain — ${dateLabel}`;
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(match);
    return groups;
  }, {});

  // Group Standings by Group/Conference if present
  const groupedStandings = standings.reduce((acc: Record<string, TournamentStanding[]>, curr) => {
    const grp = curr.groupName || 'Classement Général';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(curr);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* 🔴 AUTO LIVE ALERT & SOUND CHIME BANNER (QUAND UN MATCH COMMENCE) */}
      {liveMatchesCount > 0 && (
        <div className="relative rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border border-rose-500/40 p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
            </span>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-rose-400 tracking-wider">
                  DIRECT EN COURS ({liveMatchesCount} Matchs) :
                </span>
                <span className="text-xs font-extrabold text-white truncate max-w-[280px] sm:max-w-md">
                  {liveMatches[0].name} ({liveMatches[0].homeTeam.score} - {liveMatches[0].awayTeam.score})
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Tournoi : {liveMatches[0].leagueName} • Diffuseur : {liveMatches[0].broadcasts?.[0] || 'Direct HD'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              onClick={() => {
                setActiveModalMatch(liveMatches[0]);
                setActiveMirrorIndex(0);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-rose-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Visionner en Direct</span>
            </button>

            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playGentleChime();
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-emerald-400 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={soundEnabled ? 'Alerte sonore activée (cliquez pour couper)' : 'Alerte sonore coupée'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ARENA HERO BROADCAST BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Sports Arena Pro
              </span>
              {liveMatchesCount > 0 ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  {liveMatchesCount} Match(s) en Direct
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                  {matches.length} Matchs Programmés
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                15+ Tournois Mondiaux
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Tournois Mondiaux & Direct HD
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
              Suivez tous les tournois (Concacaf Nations League, UEFA Champions League, Premier League, NBA, MLB, UFC) :
              matchs classés par jour et heure, points des équipes en direct, et lecteur de streaming sans pub.
            </p>
          </div>

          {/* Quick Refresh & Auto-Refresh Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadMatches}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Actualisation automatique toutes les 45 secondes"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Auto-Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION VIEWS */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveView('matches')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'matches'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Calendrier par Jour & Heure</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950/80 text-sky-300 font-mono">
              {matches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('live')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'live'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>En Direct (LIVE)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 font-mono">
              {liveMatchesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveView('hub')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'hub'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Hub Tournois & Endpoints</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-300 font-mono">
              {tournaments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('standings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'standings'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Classements & Points</span>
          </button>

          <button
            onClick={() => setActiveView('channels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'channels'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4 text-teal-400" />
            <span>Chaînes Sport 24/7</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-teal-300 font-mono">
              {channels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('keys')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'keys'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30'
                : 'bg-slate-900 text-amber-300 hover:text-white border border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Générateur de Clés API</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher équipe ou tournoi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* SPORT CATEGORY & TOURNAMENT SELECTOR (POUR CALENDRIER & DIRECT) */}
      {(activeView === 'matches' || activeView === 'live') && (
        <div className="space-y-3">
          {/* Sport Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 font-bold mr-1 shrink-0">SPORTS :</span>
            {[
              { id: 'all', label: '🌐 Tous les Sports' },
              { id: 'soccer', label: '⚽ Football & Compétitions Mondiales' },
              { id: 'basketball', label: '🏀 Basketball NBA' },
              { id: 'baseball', label: '⚾ Baseball MLB' },
              { id: 'hockey', label: '🏒 Hockey NHL' },
              { id: 'football', label: '🏈 Football NFL' },
              { id: 'mma', label: '🥊 UFC & Combat' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSport(s.id);
                  setSelectedLeagueId('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  selectedSport === s.id
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Tournament & League Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedLeagueId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                selectedLeagueId === 'all'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Tous les Tournois
            </button>

            {tournaments
              .filter((t) => selectedSport === 'all' || t.sport === selectedSport)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedLeagueId(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    selectedLeagueId === t.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {t.logo && <img src={t.logo} alt={t.name} className="w-4 h-4 object-contain" />}
                  <span>{t.shortName}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* VIEW 1 & 2: MATCHES GROUPED BY DAY / DATE & HOUR */}
      {(activeView === 'matches' || activeView === 'live') && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-sm font-semibold">Chargement des matchs et horaires en direct...</p>
            </div>
          ) : Object.keys(groupedMatches).length > 0 ? (
            Object.entries(groupedMatches).map(([dateTitle, dateMatches]) => (
              <div key={dateTitle} className="space-y-3">
                {/* Date Header Badge */}
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-sky-300 w-fit">
                  <CalendarDays className="w-4 h-4 text-sky-400" />
                  <span className="uppercase tracking-wider font-extrabold">{dateTitle}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-slate-400 font-mono">
                    {dateMatches.length} Matchs
                  </span>
                </div>

                {/* Grid of Matches for this Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dateMatches.map((m) => (
                    <div
                      key={m.id}
                      className={`bg-slate-900/90 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                        m.isLive
                          ? 'border-rose-500/50 hover:border-rose-400 shadow-lg shadow-rose-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Header with Tournament and Kickoff */}
                      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {m.leagueLogo && <img src={m.leagueLogo} className="w-4 h-4 object-contain" alt="" />}
                          <span className="font-bold text-slate-300 truncate max-w-[170px]">{m.leagueName}</span>
                        </div>

                        {/* Status / KickOff Time */}
                        {m.isLive ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            <span>EN DIRECT {m.clock ? `• ${m.clock}` : ''}</span>
                          </span>
                        ) : m.status === 'finished' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            Terminé
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-black bg-slate-800 text-amber-300 border border-slate-700">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{m.kickOffTime}</span>
                          </span>
                        )}
                      </div>

                      {/* Teams & Scores Face-Off with High-Resolution Logos */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                        {/* Home Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.homeTeam.logo}
                              alt={m.homeTeam.displayName}
                              className="w-8 h-8 object-contain rounded-md bg-slate-950/50 p-0.5"
                            />
                            <div>
                              <div className="font-extrabold text-sm text-white">{m.homeTeam.displayName}</div>
                              {m.homeTeam.record && (
                                <div className="text-[10px] text-slate-400">{m.homeTeam.record}</div>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-xl font-black px-2.5 py-0.5 rounded-lg font-mono ${
                              m.isLive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-300'
                            }`}
                          >
                            {m.homeTeam.score}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.awayTeam.logo}
                              alt={m.awayTeam.displayName}
                              className="w-8 h-8 object-contain rounded-md bg-slate-950/50 p-0.5"
                            />
                            <div>
                              <div className="font-extrabold text-sm text-white">{m.awayTeam.displayName}</div>
                              {m.awayTeam.record && (
                                <div className="text-[10px] text-slate-400">{m.awayTeam.record}</div>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-xl font-black px-2.5 py-0.5 rounded-lg font-mono ${
                              m.isLive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-300'
                            }`}
                          >
                            {m.awayTeam.score}
                          </div>
                        </div>
                      </div>

                      {/* Venue & TV Broadcast Info */}
                      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[170px]">🏟️ {m.venue?.name || 'Stade Officiel'}</span>
                        <span className="font-semibold text-slate-300">{m.broadcasts?.[0] || 'Direct HD'}</span>
                      </div>

                      {/* Card Actions */}
                      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveModalMatch(m);
                            setActiveMirrorIndex(0);
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                            m.isLive
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{m.isLive ? 'Visionner le Direct' : 'Accéder au Stream'}</span>
                        </button>

                        <a
                          href={`/api/sports/player/clean?matchId=${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ouvrir dans un nouvel onglet sans pub"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 bg-slate-900/60 rounded-2xl border border-slate-800 text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-white font-bold text-base">Aucun match disponible pour ce filtre</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Changez de tournoi ou sélectionnez un autre sport pour voir le calendrier des prochains matchs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: HUB DES CLASSEMENTS & ENDPOINTS PAR SPORT ET TOURNOI */}
      {activeView === 'hub' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 rounded-2xl border border-indigo-500/30 p-6 space-y-2">
            <div className="flex items-center gap-2.5">
              <Globe className="w-6 h-6 text-indigo-400" />
              <h3 className="text-xl font-black text-white">Hub des Classements & Endpoints API par Tournoi</h3>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm">
              Chaque sport et tournoi mondial dispose de son classement officiel avec points et de ses endpoints REST dédiés.
            </p>
          </div>

          {/* Tournaments Grid Grouped by Sport */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-5 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-indigo-300 border border-slate-700">
                      {t.sport.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{t.country}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img src={t.logo} alt={t.name} className="w-10 h-10 object-contain bg-slate-950/60 p-1 rounded-xl" />
                    <div>
                      <h4 className="text-white font-extrabold text-sm">{t.name}</h4>
                      <p className="text-slate-400 text-[11px] font-mono">ID: {t.id}</p>
                    </div>
                  </div>

                  {/* Endpoints Box */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px] font-mono">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Endpoints API Développeur :</div>
                    <div className="flex items-center justify-between text-sky-400 truncate">
                      <span>GET /api/sports/matches?league={t.id}</span>
                      <a href={`/api/sports/matches?league=${t.id}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {t.hasStandings && (
                      <div className="flex items-center justify-between text-amber-300 truncate">
                        <span>GET /api/sports/standings/{t.id}</span>
                        <a href={`/api/sports/standings/${t.id}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  {t.hasStandings && (
                    <button
                      onClick={() => {
                        setStandingsLeague(t.id);
                        setActiveView('standings');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Voir le Classement</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedLeagueId(t.id);
                      setActiveView('matches');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700"
                  >
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span>Matchs & Horaires</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: CLASSEMENTS ET POINTS DÉTAILLÉS PAR TOURNOI */}
      {activeView === 'standings' && (
        <div className="space-y-4">
          {/* League Selector for Standings */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {tournaments
              .filter((t) => t.hasStandings)
              .map((l) => (
                <button
                  key={l.id}
                  onClick={() => setStandingsLeague(l.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    standingsLeague === l.id
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  {l.logo && <img src={l.logo} alt="" className="w-4 h-4 object-contain" />}
                  <span>{l.shortName}</span>
                </button>
              ))}
          </div>

          {/* D3 ANALYTICAL CHARTS (TRAJECTOIRE, H2H, DISTRIBUTION) */}
          {!loadingStandings && standings.length > 0 && (
            <SportsD3Charts
              standings={standings}
              matches={matches.filter((m) => m.leagueId === standingsLeague)}
              leagueName={tournaments.find((t) => t.id === standingsLeague)?.name}
            />
          )}

          {/* Standings Tables by Group / Conference */}
          {loadingStandings ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm font-semibold">Calcul des points et statistiques d'équipes...</p>
            </div>
          ) : Object.keys(groupedStandings).length > 0 ? (
            Object.entries(groupedStandings).map(([groupTitle, groupTeams]) => (
              <div key={groupTitle} className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl mb-6">
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-extrabold text-white">{groupTitle}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Actualisé en temps réel</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-3 text-center">Rang</th>
                        <th className="py-3 px-4">Équipe</th>
                        <th className="py-3 px-3 text-center">MJ</th>
                        <th className="py-3 px-3 text-center">V</th>
                        <th className="py-3 px-3 text-center">N</th>
                        <th className="py-3 px-3 text-center">D</th>
                        <th className="py-3 px-3 text-center hidden sm:table-cell">BP</th>
                        <th className="py-3 px-3 text-center hidden sm:table-cell">BC</th>
                        <th className="py-3 px-3 text-center">Diff</th>
                        <th className="py-3 px-4 text-center font-black text-amber-400">POINTS</th>
                        <th className="py-3 px-3 text-center hidden md:table-cell">Forme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {groupTeams.map((team) => (
                        <tr key={team.teamId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 text-center font-bold">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-xs ${
                                team.rank <= 4
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                  : team.rank >= 18
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'text-slate-400'
                              }`}
                            >
                              {team.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex items-center gap-3">
                            <img src={team.teamLogo} alt={team.teamName} className="w-6 h-6 object-contain" />
                            <span className="font-extrabold text-white text-xs sm:text-sm">{team.teamName}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{team.gamesPlayed}</td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-400">{team.wins}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">{team.draws}</td>
                          <td className="py-3 px-3 text-center font-mono text-rose-400">{team.losses}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 hidden sm:table-cell">
                            {team.goalsFor}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 hidden sm:table-cell">
                            {team.goalsAgainst}
                          </td>
                          <td
                            className={`py-3 px-3 text-center font-mono font-bold ${
                              team.goalDifference > 0
                                ? 'text-emerald-400'
                                : team.goalDifference < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                          </td>
                          <td className="py-3 px-4 text-center font-black font-mono text-sm text-amber-300 bg-amber-500/5">
                            {team.points}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs hidden md:table-cell">
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-bold border border-slate-800">
                              {team.form || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucun classement disponible pour cette compétition actuellement.
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: CHAÎNES SPORT 24/7 */}
      {activeView === 'channels' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {channels.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-4 transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      EN DIRECT 24/7
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{c.country}</span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800/90 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                      <img
                        src={c.logo}
                        alt={c.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logos/bein1.svg';
                        }}
                      />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-white font-extrabold text-sm truncate group-hover:text-indigo-300 transition-colors">
                        {c.name}
                      </h4>
                      <p className="text-slate-400 text-xs truncate">{c.category}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Programme :</span>
                    <span className="font-semibold">{c.currentProgram}</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveModalChannel(c);
                      setActiveModalMatch(null);
                      setActiveMirrorIndex(0);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Regarder la Chaîne</span>
                  </button>

                  <a
                    href={`/api/sports/player/clean?channelId=${c.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 6: GÉNÉRATEUR & GESTION DES CLÉS API SPORT */}
      {activeView === 'keys' && (
        <div className="space-y-6">
          {/* Key Generator Form Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Générateur de Clés API Sports Live</h3>
                  <p className="text-slate-400 text-xs">
                    Générez une clé instantanée pour connecter vos applications (Telegram Bot, Site Web, Scripts, etc.)
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Format: jmh_sport_[tier]_[hex]
              </span>
            </div>

            <form onSubmit={handleGenerateKey} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom / Label du Projet</label>
                <input
                  type="text"
                  placeholder="Ex: MonBotFootballLive"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom d'utilisateur / Propriétaire</label>
                <input
                  type="text"
                  placeholder="Ex: user_pro_123"
                  value={newKeyUsername}
                  onChange={(e) => setNewKeyUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Générer Clé Immédiate</span>
                </button>
              </div>
            </form>

            {/* Success Banner When Key Generated */}
            {createdKey && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Nouvelle Clé API Générée et Enregistrée avec Succès !
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Quota: {createdKey.rateLimitPerMinute} req/min</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <code className="text-xs font-mono text-amber-300 flex-1 truncate">{createdKey.key}</code>
                  <button
                    onClick={() => handleCopyKey(createdKey.key)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
                  >
                    {copiedKey === createdKey.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === createdKey.key ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Keys List */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-extrabold text-white">Clés API Actives</span>
              </div>
              <button
                onClick={fetchKeys}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingKeys ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                    <th className="py-2.5 px-4">Clé API</th>
                    <th className="py-2.5 px-3">Label</th>
                    <th className="py-2.5 px-3">Utilisateur</th>
                    <th className="py-2.5 px-3 text-center">Quota / min</th>
                    <th className="py-2.5 px-3 text-center">Requêtes</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                  {keysList.map((k) => (
                    <tr key={k.key} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-xs text-amber-300">
                        {k.key.substring(0, 18)}...
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">{k.label}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono">@{k.username}</td>
                      <td className="py-3 px-3 text-center font-mono text-sky-400 font-bold">
                        {k.rateLimitPerMinute} req/min
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">
                        {k.requestsCount}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Actif
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleCopyKey(k.key)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] cursor-pointer"
                        >
                          {copiedKey === k.key ? 'Copié !' : 'Copier'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Integration Code Snippets */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              <span>Comment utiliser votre clé API</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">Option 1 : Via l’en-tête HTTP (Recommandé)</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto">
{`curl -X GET "https://votre-domaine.up.railway.app/api/sports/matches/live" \\
  -H "x-api-key: VOTRE_CLE_API"`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300">Option 2 : Via le paramètre URL (?apiKey=)</span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
{`curl "https://votre-domaine.up.railway.app/api/sports/matches?apiKey=VOTRE_CLE_API"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIVE STREAM PLAYER (FOR MATCH OR CHANNEL) WITH IN-UI ERROR HANDLING & LOGS */}
      {(activeModalMatch || activeModalChannel) && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          {(() => {
            let currentStreams: StreamMirror[] = [];
            if (activeModalMatch) {
              currentStreams = activeModalMatch.streams;
            } else if (activeModalChannel?.streams && activeModalChannel.streams.length > 0) {
              currentStreams = activeModalChannel.streams;
            } else {
              currentStreams = [
                {
                  id: 'ch-m1',
                  name: 'Serveur 1 HD (Flux HLS Direct)',
                  quality: 'HD 1080p',
                  lang: 'FR',
                  url: activeModalChannel?.streamUrl || '',
                  embedUrl: activeModalChannel?.embedUrl || '',
                  type: 'hls',
                  isOfficial: true,
                },
                {
                  id: 'ch-m2',
                  name: 'Serveur 2 HD (Omnisport Live)',
                  quality: 'HD 720p',
                  lang: 'FR',
                  url: 'https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8',
                  embedUrl: 'https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8',
                  type: 'hls',
                },
                {
                  id: 'ch-m3',
                  name: 'Serveur 3 Sans Pub',
                  quality: 'HD 1080p',
                  lang: 'FR',
                  url: `/api/sports/player/clean?channelId=${activeModalChannel?.id || ''}&mirror=1`,
                  embedUrl: `/api/sports/player/clean?channelId=${activeModalChannel?.id || ''}&mirror=1`,
                  type: 'embed',
                },
              ];
            }

            return (
              <SportsPlayer
                title={activeModalMatch ? activeModalMatch.name : (activeModalChannel?.name || 'Direct Sport Live')}
                subtitle={
                  activeModalMatch
                    ? `${activeModalMatch.leagueName} • ${activeModalMatch.kickOffDateFormatted} à ${activeModalMatch.kickOffTime}`
                    : `${activeModalChannel?.category} • En Direct 24/7 (${activeModalChannel?.country})`
                }
                streams={currentStreams}
                currentMirrorIndex={activeMirrorIndex}
                onSelectMirror={(idx) => setActiveMirrorIndex(idx)}
                onClose={() => {
                  setActiveModalMatch(null);
                  setActiveModalChannel(null);
                }}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
};
