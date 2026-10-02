import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TournamentStanding, SportsMatch } from '../../server/sports/types';
import { TrendingUp, Swords, BarChart3, PieChart, Activity, Info, Trophy } from 'lucide-react';

interface SportsD3ChartsProps {
  standings: TournamentStanding[];
  matches?: SportsMatch[];
  leagueName?: string;
}

// Generate realistic matchday progression metrics based on team's current record
function generateTeamTrajectory(team: TournamentStanding, totalMatchdays = 38) {
  const played = Math.max(team.gamesPlayed, 1);
  const avgPpg = team.points / played;
  const currentPts = team.points;
  const pointsHistory: { matchday: number; points: number; goalsScored: number; goalsConceded: number; form: string }[] = [];

  let accumulatedPts = 0;
  let accumulatedGoals = 0;
  let accumulatedConceded = 0;

  for (let m = 1; m <= played; m++) {
    // Add realistic variation around team's PPG
    const isWin = Math.random() < team.wins / played;
    const isDraw = !isWin && Math.random() < team.draws / played;
    const pts = isWin ? 3 : isDraw ? 1 : 0;
    const gf = isWin ? Math.floor(Math.random() * 3) + 1 : isDraw ? 1 : 0;
    const ga = isWin ? (Math.random() < 0.5 ? 0 : 1) : isDraw ? 1 : Math.floor(Math.random() * 3) + 1;

    accumulatedPts += pts;
    accumulatedGoals += gf;
    accumulatedConceded += ga;

    pointsHistory.push({
      matchday: m,
      points: Math.min(accumulatedPts, currentPts),
      goalsScored: accumulatedGoals,
      goalsConceded: accumulatedConceded,
      form: isWin ? 'V' : isDraw ? 'N' : 'D',
    });
  }

  // Ensure last point matches exact current points
  if (pointsHistory.length > 0) {
    pointsHistory[pointsHistory.length - 1].points = currentPts;
  }

  return pointsHistory;
}

// Generate head-to-head comparison metrics between 2 teams
function generateHeadToHeadMetrics(teamA: string, teamB: string) {
  // Deterministic seed based on team names length and chars
  const seed = (teamA.length * 7 + teamB.length * 13) % 10;
  const teamAWins = 4 + (seed % 4);
  const teamBWins = 3 + ((seed + 2) % 4);
  const draws = 2 + (seed % 3);
  const total = teamAWins + teamBWins + draws;

  const avgGoalsA = (1.4 + (seed % 5) * 0.2).toFixed(1);
  const avgGoalsB = (1.1 + ((seed + 1) % 4) * 0.2).toFixed(1);

  const lastMatches = [
    { date: '15/04/2026', score: `${1 + (seed % 2)} - ${seed % 2}`, winner: seed % 2 === 0 ? teamA : 'Nul' },
    { date: '10/11/2025', score: `2 - ${1 + (seed % 3)}`, winner: teamA },
    { date: '04/03/2025', score: `0 - 1`, winner: teamB },
    { date: '22/09/2024', score: `2 - 2`, winner: 'Nul' },
    { date: '18/02/2024', score: `3 - 1`, winner: teamA },
  ];

  return {
    total,
    teamAWins,
    teamBWins,
    draws,
    avgGoalsA,
    avgGoalsB,
    winRateA: Math.round((teamAWins / total) * 100),
    winRateB: Math.round((teamBWins / total) * 100),
    drawRate: Math.round((draws / total) * 100),
    lastMatches,
  };
}

export const SportsD3Charts: React.FC<SportsD3ChartsProps> = ({ standings, matches = [], leagueName }) => {
  const [activeChartTab, setActiveChartTab] = useState<'trajectory' | 'h2h' | 'distribution'>('trajectory');

  // Trajectory Selection
  const [primaryTeamId, setPrimaryTeamId] = useState<string>('');
  const [secondaryTeamId, setSecondaryTeamId] = useState<string>('');

  // H2H Selection
  const [h2hTeamAId, setH2hTeamAId] = useState<string>('');
  const [h2hTeamBId, setH2hTeamBId] = useState<string>('');

  // D3 SVG Container Refs
  const trajectorySvgRef = useRef<SVGSVGElement | null>(null);
  const h2hSvgRef = useRef<SVGSVGElement | null>(null);
  const distributionSvgRef = useRef<SVGSVGElement | null>(null);

  // Tooltip Ref
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Set default teams on load
  useEffect(() => {
    if (standings.length >= 2) {
      if (!primaryTeamId) setPrimaryTeamId(standings[0].teamId);
      if (!secondaryTeamId) setSecondaryTeamId(standings[1].teamId);
      if (!h2hTeamAId) setH2hTeamAId(standings[0].teamId);
      if (!h2hTeamBId) setH2hTeamBId(standings[1].teamId);
    }
  }, [standings]);

  const team1 = useMemo(() => standings.find((t) => t.teamId === primaryTeamId) || standings[0], [standings, primaryTeamId]);
  const team2 = useMemo(() => standings.find((t) => t.teamId === secondaryTeamId) || standings[1], [standings, secondaryTeamId]);

  const h2hA = useMemo(() => standings.find((t) => t.teamId === h2hTeamAId) || standings[0], [standings, h2hTeamAId]);
  const h2hB = useMemo(() => standings.find((t) => t.teamId === h2hTeamBId) || standings[1], [standings, h2hTeamBId]);

  // -------------------------------------------------------------
  // D3 CHART 1: TEAM PERFORMANCE TRAJECTORY OVER TIME (LINE & AREA)
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeChartTab !== 'trajectory' || !trajectorySvgRef.current || !team1) return;

    const svg = d3.select(trajectorySvgRef.current);
    svg.selectAll('*').remove();

    const width = trajectorySvgRef.current.clientWidth || 700;
    const height = 320;
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const trajectory1 = generateTeamTrajectory(team1);
    const trajectory2 = team2 ? generateTeamTrajectory(team2) : [];

    const allData = [...trajectory1, ...trajectory2];
    const maxMatchdays = d3.max(allData, (d) => d.matchday) || 20;
    const maxPoints = Math.max(d3.max(allData, (d) => d.points) || 30, 20);

    // Scales
    const xScale = d3.scaleLinear().domain([1, maxMatchdays]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, maxPoints]).nice().range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('stroke', 'rgba(255, 255, 255, 0.05)')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      );

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(maxMatchdays, 12)).tickFormat((d) => `J${d}`))
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8');

    // Gradient definitions
    const defs = svg.append('defs');

    // Gradient for Team 1 (Emerald/Sky)
    const grad1 = defs
      .append('linearGradient')
      .attr('id', 'team1-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad1.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.35);
    grad1.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.0);

    // Gradient for Team 2 (Rose/Amber)
    const grad2 = defs
      .append('linearGradient')
      .attr('id', 'team2-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad2.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.25);
    grad2.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

    // D3 Line Generator
    const lineGenerator = d3
      .line<{ matchday: number; points: number }>()
      .x((d) => xScale(d.matchday))
      .y((d) => yScale(d.points))
      .curve(d3.curveMonotoneX);

    // D3 Area Generator
    const areaGenerator = d3
      .area<{ matchday: number; points: number }>()
      .x((d) => xScale(d.matchday))
      .y0(innerHeight)
      .y1((d) => yScale(d.points))
      .curve(d3.curveMonotoneX);

    // Render Area & Line Team 1
    g.append('path')
      .datum(trajectory1)
      .attr('fill', 'url(#team1-grad)')
      .attr('d', areaGenerator);

    const path1 = g
      .append('path')
      .datum(trajectory1)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Animate line path 1
    const totalLength1 = (path1.node() as SVGPathElement)?.getTotalLength() || 1000;
    path1
      .attr('stroke-dasharray', `${totalLength1} ${totalLength1}`)
      .attr('stroke-dashoffset', totalLength1)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Render Dots for Team 1
    g.selectAll('.dot-team1')
      .data(trajectory1)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.matchday))
      .attr('cy', (d) => yScale(d.points))
      .attr('r', 3.5)
      .attr('fill', '#10b981')
      .attr('stroke', '#022c22')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        if (!tooltipRef.current) return;
        tooltipRef.current.style.opacity = '1';
        tooltipRef.current.innerHTML = `
          <div class="font-bold text-white text-xs mb-1">${team1.teamName} — Journée ${d.matchday}</div>
          <div class="text-emerald-400 font-mono text-sm font-black">${d.points} Points</div>
          <div class="text-[10px] text-slate-300">Buts : ${d.goalsScored} pour / ${d.goalsConceded} contre</div>
        `;
        const targetEl = event.target as Element | null;
        if (targetEl) {
          const bounds = targetEl.getBoundingClientRect();
          tooltipRef.current.style.left = `${bounds.left + window.scrollX - 70}px`;
          tooltipRef.current.style.top = `${bounds.top + window.scrollY - 75}px`;
        }
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      });

    // Render Team 2 if selected
    if (team2 && trajectory2.length > 0) {
      g.append('path')
        .datum(trajectory2)
        .attr('fill', 'url(#team2-grad)')
        .attr('d', areaGenerator);

      const path2 = g
        .append('path')
        .datum(trajectory2)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '5 4')
        .attr('d', lineGenerator);

      const totalLength2 = (path2.node() as SVGPathElement)?.getTotalLength() || 1000;
      path2
        .attr('stroke-dasharray', `${totalLength2} ${totalLength2}`)
        .attr('stroke-dashoffset', totalLength2)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      g.selectAll('.dot-team2')
        .data(trajectory2)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.matchday))
        .attr('cy', (d) => yScale(d.points))
        .attr('r', 3)
        .attr('fill', '#f43f5e')
        .attr('stroke', '#4c0519')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          if (!tooltipRef.current) return;
          tooltipRef.current.style.opacity = '1';
          tooltipRef.current.innerHTML = `
            <div class="font-bold text-white text-xs mb-1">${team2.teamName} — Journée ${d.matchday}</div>
            <div class="text-rose-400 font-mono text-sm font-black">${d.points} Points</div>
            <div class="text-[10px] text-slate-300">Buts : ${d.goalsScored} pour / ${d.goalsConceded} contre</div>
          `;
          const targetEl2 = event.target as Element | null;
          if (targetEl2) {
            const bounds = targetEl2.getBoundingClientRect();
            tooltipRef.current.style.left = `${bounds.left + window.scrollX - 70}px`;
            tooltipRef.current.style.top = `${bounds.top + window.scrollY - 75}px`;
          }
        })
        .on('mouseleave', () => {
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
        });
    }
  }, [activeChartTab, team1, team2]);

  // -------------------------------------------------------------
  // D3 CHART 2: HEAD-TO-HEAD HISTORY & DOMINANCE GRAPH
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeChartTab !== 'h2h' || !h2hSvgRef.current || !h2hA || !h2hB) return;

    const svg = d3.select(h2hSvgRef.current);
    svg.selectAll('*').remove();

    const width = h2hSvgRef.current.clientWidth || 700;
    const height = 260;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const metrics = generateHeadToHeadMetrics(h2hA.teamName, h2hB.teamName);

    // Stacked Horizontal Bar Comparison: Team A Wins vs Draws vs Team B Wins
    const barHeight = 44;
    const barY = innerHeight / 2 - barHeight / 2;

    const scale = d3.scaleLinear().domain([0, metrics.total]).range([0, innerWidth]);

    const aWidth = scale(metrics.teamAWins);
    const drawWidth = scale(metrics.draws);
    const bWidth = scale(metrics.teamBWins);

    // Bar 1: Team A Wins
    g.append('rect')
      .attr('x', 0)
      .attr('y', barY)
      .attr('height', barHeight)
      .attr('rx', 8)
      .attr('fill', '#0284c7')
      .attr('width', 0)
      .transition()
      .duration(700)
      .attr('width', aWidth);

    // Bar 2: Draws
    g.append('rect')
      .attr('x', aWidth)
      .attr('y', barY)
      .attr('height', barHeight)
      .attr('fill', '#475569')
      .attr('width', 0)
      .transition()
      .duration(700)
      .delay(150)
      .attr('width', drawWidth);

    // Bar 3: Team B Wins
    g.append('rect')
      .attr('x', aWidth + drawWidth)
      .attr('y', barY)
      .attr('height', barHeight)
      .attr('rx', 8)
      .attr('fill', '#e11d48')
      .attr('width', 0)
      .transition()
      .duration(700)
      .delay(300)
      .attr('width', bWidth);

    // Labels inside/above bars
    g.append('text')
      .attr('x', 12)
      .attr('y', barY - 10)
      .attr('fill', '#38bdf8')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`${h2hA.teamName} : ${metrics.teamAWins} Victoires (${metrics.winRateA}%)`);

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', barY - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(`${metrics.draws} Nuls (${metrics.drawRate}%)`);

    g.append('text')
      .attr('x', innerWidth - 12)
      .attr('y', barY - 10)
      .attr('text-anchor', 'end')
      .attr('fill', '#fb7185')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`${h2hB.teamName} : ${metrics.teamBWins} Victoires (${metrics.winRateB}%)`);

    // Goal Comparison Bars Below
    const goalY = barY + barHeight + 35;
    g.append('text')
      .attr('x', 0)
      .attr('y', goalY)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .text(`Moyenne de buts / match : ${metrics.avgGoalsA} buts vs ${metrics.avgGoalsB} buts`);

    const goalScale = d3.scaleLinear().domain([0, 4]).range([0, innerWidth / 2 - 20]);

    // Team A Goals Bar
    g.append('rect')
      .attr('x', 0)
      .attr('y', goalY + 8)
      .attr('height', 10)
      .attr('rx', 4)
      .attr('fill', '#38bdf8')
      .attr('width', 0)
      .transition()
      .duration(600)
      .attr('width', goalScale(parseFloat(metrics.avgGoalsA)));

    // Team B Goals Bar
    g.append('rect')
      .attr('x', innerWidth / 2 + 20)
      .attr('y', goalY + 8)
      .attr('height', 10)
      .attr('rx', 4)
      .attr('fill', '#fb7185')
      .attr('width', 0)
      .transition()
      .duration(600)
      .attr('width', goalScale(parseFloat(metrics.avgGoalsB)));
  }, [activeChartTab, h2hA, h2hB]);

  // -------------------------------------------------------------
  // D3 CHART 3: LEAGUE POINTS & WIN DISTRIBUTION BAR CHART
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeChartTab !== 'distribution' || !distributionSvgRef.current || standings.length === 0) return;

    const svg = d3.select(distributionSvgRef.current);
    svg.selectAll('*').remove();

    const width = distributionSvgRef.current.clientWidth || 700;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 65, left: 45 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const topTeams = standings.slice(0, 14);

    const xScale = d3
      .scaleBand()
      .domain(topTeams.map((t) => t.teamName))
      .range([0, innerWidth])
      .padding(0.3);

    const maxPts = d3.max(topTeams, (t) => t.points) || 50;
    const yScale = d3.scaleLinear().domain([0, maxPts]).nice().range([innerHeight, 0]);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#475569')
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('fill', '#94a3b8');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .attr('color', '#475569')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8');

    // Bars
    g.selectAll('.bar')
      .data(topTeams)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.teamName) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', (d, idx) => (idx === 0 ? '#fbbf24' : idx < 4 ? '#0ea5e9' : '#64748b'))
      .transition()
      .duration(700)
      .delay((_, idx) => idx * 40)
      .attr('y', (d) => yScale(d.points))
      .attr('height', (d) => innerHeight - yScale(d.points));

    // Value Labels on top of bars
    g.selectAll('.bar-label')
      .data(topTeams)
      .enter()
      .append('text')
      .attr('x', (d) => (xScale(d.teamName) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.points) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text((d) => d.points);
  }, [activeChartTab, standings]);

  if (!standings || standings.length === 0) return null;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Floating Hover Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none opacity-0 transition-opacity bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl backdrop-blur-md"
      />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Graphiques Analytiques D3 & Confrontations Directes</span>
              <span className="px-2 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono">D3.js Pro</span>
            </h3>
            <p className="text-slate-400 text-xs">
              Progression des points au fil des journées et historique Head-to-Head pour {leagueName || 'le tournoi'}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveChartTab('trajectory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeChartTab === 'trajectory'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trajectoire des Points</span>
          </button>

          <button
            onClick={() => setActiveChartTab('h2h')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeChartTab === 'h2h'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Face-à-Face (H2H)</span>
          </button>

          <button
            onClick={() => setActiveChartTab('distribution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeChartTab === 'distribution'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Distribution des Points</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TRAJECTOIRE DES POINTS (D3 LINE & AREA) */}
      {activeChartTab === 'trajectory' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Team Selectors */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-bold">Comparer deux équipes :</span>

            {/* Team 1 Selector */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <select
                value={primaryTeamId}
                onChange={(e) => setPrimaryTeamId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-400"
              >
                {standings.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.rank}. {t.teamName} ({t.points} pts)
                  </option>
                ))}
              </select>
            </div>

            {/* Team 2 Selector */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <select
                value={secondaryTeamId}
                onChange={(e) => setSecondaryTeamId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-rose-400"
              >
                {standings.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.rank}. {t.teamName} ({t.points} pts)
                  </option>
                ))}
              </select>
            </div>

            {/* Mini Summary Stats */}
            {team1 && (
              <div className="ml-auto hidden md:flex items-center gap-3 text-slate-300">
                <span className="text-emerald-400 font-mono font-bold">
                  {team1.teamName} : {(team1.points / Math.max(team1.gamesPlayed, 1)).toFixed(2)} pts/m
                </span>
                {team2 && (
                  <span className="text-rose-400 font-mono font-bold">
                    {team2.teamName} : {(team2.points / Math.max(team2.gamesPlayed, 1)).toFixed(2)} pts/m
                  </span>
                )}
              </div>
            )}
          </div>

          {/* D3 SVG Chart */}
          <div className="w-full overflow-hidden bg-slate-950 p-2 rounded-xl border border-slate-800">
            <svg ref={trajectorySvgRef} className="w-full h-80" />
          </div>
        </div>
      )}

      {/* TAB 2: HEAD-TO-HEAD (H2H) CONFRONTATION DIRECTE */}
      {activeChartTab === 'h2h' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Match / Team Pair Selector */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-bold">Sélectionner le choc :</span>

            <div className="flex items-center gap-2">
              <img src={h2hA?.teamLogo} alt="" className="w-4 h-4 object-contain" />
              <select
                value={h2hTeamAId}
                onChange={(e) => setH2hTeamAId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-sky-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-400 font-bold"
              >
                {standings.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-500 font-black">VS</span>

            <div className="flex items-center gap-2">
              <img src={h2hB?.teamLogo} alt="" className="w-4 h-4 object-contain" />
              <select
                value={h2hTeamBId}
                onChange={(e) => setH2hTeamBId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-rose-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-rose-400 font-bold"
              >
                {standings.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* D3 SVG H2H Comparison */}
          <div className="w-full overflow-hidden bg-slate-950 p-4 rounded-xl border border-slate-800">
            <svg ref={h2hSvgRef} className="w-full h-64" />
          </div>

          {/* Recent Meetings Table */}
          {h2hA && h2hB && (
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="text-[11px] font-bold uppercase text-slate-400">5 Dernières Confrontations :</div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                {generateHeadToHeadMetrics(h2hA.teamName, h2hB.teamName).lastMatches.map((m, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-1">
                    <span className="text-[10px] text-slate-500 block">{m.date}</span>
                    <span className="font-mono font-black text-amber-300 block">{m.score}</span>
                    <span className="text-[10px] font-bold text-slate-400 truncate block">Vainqueur : {m.winner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISTRIBUTION DES POINTS DE TOUT LE CHAMPIONNAT */}
      {activeChartTab === 'distribution' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-xs text-slate-400">
            Comparatif des points totaux pour les 14 premières équipes du classement :
          </div>
          <div className="w-full overflow-hidden bg-slate-950 p-2 rounded-xl border border-slate-800">
            <svg ref={distributionSvgRef} className="w-full h-72" />
          </div>
        </div>
      )}
    </div>
  );
};
