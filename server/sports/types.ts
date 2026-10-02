export type SportCategory = 'soccer' | 'basketball' | 'tennis' | 'mma' | 'racing' | 'rugby' | 'football' | 'baseball' | 'hockey';

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface SportsTeam {
  id: string;
  name: string;
  shortName: string;
  displayName: string;
  logo: string;
  score: number;
  points?: number;
  record?: string;
  homeAway: 'home' | 'away';
}

export interface StreamMirror {
  id: string;
  name: string;
  quality: 'HD 1080p' | 'HD 720p' | 'SD 480p' | '4K';
  lang: 'FR' | 'EN' | 'ES' | 'AR' | 'Multi';
  url: string;
  embedUrl: string;
  type: 'embed' | 'hls' | 'web';
  isOfficial?: boolean;
}

export interface SportsMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueLogo?: string;
  sport: SportCategory;
  name: string;
  shortName: string;
  date: string;
  kickOffTime: string;
  kickOffDateFormatted: string;
  timestamp: number;
  status: MatchStatus;
  statusDetail: string;
  clock?: string;
  period?: number | string;
  isLive: boolean;
  homeTeam: SportsTeam;
  awayTeam: SportsTeam;
  venue?: {
    name: string;
    city?: string;
  };
  broadcasts?: string[];
  streams: StreamMirror[];
}

export interface TournamentStanding {
  rank: number;
  teamId: string;
  teamName: string;
  teamLogo: string;
  groupName?: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
}

export interface TournamentLeague {
  id: string;
  espnId: string;
  sport: SportCategory;
  name: string;
  shortName: string;
  country: string;
  logo: string;
  hasStandings: boolean;
  active: boolean;
}

export interface SportsChannel {
  id: string;
  name: string;
  category: string;
  country: string;
  logo: string;
  streamUrl: string;
  embedUrl: string;
  streams?: StreamMirror[];
  status: 'online' | 'standby';
  currentProgram?: string;
}
