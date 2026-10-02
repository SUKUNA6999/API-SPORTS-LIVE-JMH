import React from "react";
import { SportsArena } from "./components/SportsArena";
import { Trophy, ExternalLink } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <Trophy className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold text-lg tracking-tight">JMH Sports Live</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  API Pro v1.0
                </span>
              </div>
              <p className="text-slate-400 text-xs hidden sm:block">
                Tournois mondiaux, scores en temps réel, points d’équipes, graphiques D3 & streaming HD sans pub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400 font-bold">API Live Active</span>
            </div>

            <a
              href="/api/sports/tournaments"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
            >
              <span>API Endpoints</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <SportsArena />
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-8 px-4 sm:px-6 lg:px-8 mt-16 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-black text-slate-950">
              JS
            </div>
            <span>JMH Sports Live API & Streaming Engine — Prêt pour Railway</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="/api/sports/matches" target="_blank" className="hover:text-white transition-colors">
              /api/sports/matches
            </a>
            <span>•</span>
            <a href="/api/sports/standings/concacaf-nl" target="_blank" className="hover:text-white transition-colors">
              Concacaf
            </a>
            <span>•</span>
            <a href="/api/health" target="_blank" className="hover:text-white transition-colors">
              Health Check
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
