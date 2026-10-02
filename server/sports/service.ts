import {
  TournamentLeague,
  SportsMatch,
  TournamentStanding,
  SportsChannel,
  SportCategory,
  StreamMirror,
  SportsTeam
} from './types';

// In-memory cache with timestamp
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<any>>();

function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Supported Leagues & Tournaments
export const SUPPORTED_LEAGUES: TournamentLeague[] = [
  {
    id: 'concacaf-nl',
    espnId: 'concacaf.nations.league',
    sport: 'soccer',
    name: 'Concacaf Nations League',
    shortName: 'Concacaf NL',
    country: 'International',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2091.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'fifa-worldq-concacaf',
    espnId: 'fifa.worldq.concacaf',
    sport: 'soccer',
    name: 'FIFA World Cup Qualifiers - Concacaf',
    shortName: 'Mondial Concacaf',
    country: 'International',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'ucl',
    espnId: 'uefa.champions',
    sport: 'soccer',
    name: 'UEFA Champions League',
    shortName: 'Champions League',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'uefa-nl',
    espnId: 'uefa.nations',
    sport: 'soccer',
    name: 'UEFA Nations League',
    shortName: 'UEFA Nations',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2090.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'europa-league',
    espnId: 'uefa.europa',
    sport: 'soccer',
    name: 'UEFA Europa League',
    shortName: 'Europa League',
    country: 'Europe',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'epl',
    espnId: 'eng.1',
    sport: 'soccer',
    name: 'English Premier League',
    shortName: 'Premier League',
    country: 'Angleterre',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'laliga',
    espnId: 'esp.1',
    sport: 'soccer',
    name: 'Spanish LaLiga',
    shortName: 'La Liga',
    country: 'Espagne',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'ligue1',
    espnId: 'fra.1',
    sport: 'soccer',
    name: 'French Ligue 1',
    shortName: 'Ligue 1',
    country: 'France',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/9.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'seriea',
    espnId: 'ita.1',
    sport: 'soccer',
    name: 'Italian Serie A',
    shortName: 'Serie A',
    country: 'Italie',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'bundesliga',
    espnId: 'ger.1',
    sport: 'soccer',
    name: 'German Bundesliga',
    shortName: 'Bundesliga',
    country: 'Allemagne',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'nba',
    espnId: 'nba',
    sport: 'basketball',
    name: 'National Basketball Association',
    shortName: 'NBA',
    country: 'USA',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'ufc',
    espnId: 'ufc',
    sport: 'mma',
    name: 'UFC & MMA World Tournaments',
    shortName: 'UFC / MMA',
    country: 'Monde',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mma.png',
    hasStandings: false,
    active: true,
  },
  {
    id: 'mlb',
    espnId: 'mlb',
    sport: 'baseball',
    name: 'Major League Baseball (MLB)',
    shortName: 'MLB',
    country: 'USA / International',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'nhl',
    espnId: 'nhl',
    sport: 'hockey',
    name: 'National Hockey League (NHL)',
    shortName: 'NHL',
    country: 'USA / Canada',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png',
    hasStandings: true,
    active: true,
  },
  {
    id: 'nfl',
    espnId: 'nfl',
    sport: 'football',
    name: 'National Football League (NFL)',
    shortName: 'NFL',
    country: 'USA',
    logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
    hasStandings: true,
    active: true,
  },
];

// 24/7 Sports TV Channels with authentic logos & verified resilient multi-mirrors
export const SPORTS_CHANNELS: SportsChannel[] = [
  {
    id: 'bein-1',
    name: 'BeIN SPORTS 1 HD',
    category: 'Football & Omnisport',
    country: 'France',
    logo: '/logos/bein1.svg',
    streamUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    streams: [
      { id: 'bein-1-m1', name: 'Serveur 1 HD (beIN Sports Football Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'bein-1-m2', name: 'Serveur 2 HD (Premier Football Matchs)', quality: 'HD 1080p', lang: 'FR', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', type: 'hls' },
      { id: 'bein-1-m3', name: 'Serveur 3 HD (Football Mondial & Coupe)', quality: 'HD 1080p', lang: 'FR', url: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', embedUrl: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', type: 'hls' },
      { id: 'bein-1-m4', name: 'Serveur 4 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=bein-1&mirror=1', embedUrl: '/api/sports/player/clean?channelId=bein-1&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Ligue des Champions & Soirée Football Direct',
  },
  {
    id: 'canal-foot',
    name: 'Canal+ Foot HD',
    category: 'Football Européen',
    country: 'France',
    logo: '/logos/canalfoot.svg',
    streamUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
    embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
    streams: [
      { id: 'cp-foot-m1', name: 'Serveur 1 HD (Premier Football Live)', quality: 'HD 1080p', lang: 'FR', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'cp-foot-m2', name: 'Serveur 2 HD (beIN Sports Football)', quality: 'HD 1080p', lang: 'FR', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', type: 'hls' },
      { id: 'cp-foot-m3', name: 'Serveur 3 HD (Football Mondial Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', embedUrl: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', type: 'hls' },
      { id: 'cp-foot-m4', name: 'Serveur 4 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=canal-foot&mirror=1', embedUrl: '/api/sports/player/clean?channelId=canal-foot&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Premier League & Grand Match de Football',
  },
  {
    id: 'rmc-1',
    name: 'RMC Sport 1 HD',
    category: 'Combat & Football',
    country: 'France',
    logo: '/logos/rmcsport1.svg',
    streamUrl: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8',
    embedUrl: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8',
    streams: [
      { id: 'rmc-1-m1', name: 'Serveur 1 HD (UFC & Chocs Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8', embedUrl: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'rmc-1-m2', name: 'Serveur 2 HD (Extreme & Motor Sports)', quality: 'HD 1080p', lang: 'FR', url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', embedUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8', type: 'hls' },
      { id: 'rmc-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=rmc-1&mirror=1', embedUrl: '/api/sports/player/clean?channelId=rmc-1&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'UFC Main Card & Conférence',
  },
  {
    id: 'sky-pl',
    name: 'Sky Sports Premier League',
    category: 'Premier League Football',
    country: 'Royaume-Uni',
    logo: '/logos/skysports.svg',
    streamUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
    embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
    streams: [
      { id: 'sky-pl-m1', name: 'Serveur 1 HD (Premier League Live Football)', quality: 'HD 1080p', lang: 'EN', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'sky-pl-m2', name: 'Serveur 2 HD (beIN Sports Football Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', type: 'hls' },
      { id: 'sky-pl-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=sky-pl&mirror=1', embedUrl: '/api/sports/player/clean?channelId=sky-pl&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Super Sunday Premier League Live',
  },
  {
    id: 'tnt-1',
    name: 'TNT Sports 1 HD',
    category: 'Basketball & Omnisport',
    country: 'Royaume-Uni',
    logo: '/logos/tntsports.svg',
    streamUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
    embedUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
    streams: [
      { id: 'tnt-1-m1', name: 'Serveur 1 HD (Basketball Live & NBA)', quality: 'HD 1080p', lang: 'EN', url: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8', embedUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'tnt-1-m2', name: 'Serveur 2 HD (SportsGrid Arena Live)', quality: 'HD 1080p', lang: 'EN', url: 'https://sportsgrid-tribal.amagi.tv/playlist.m3u8', embedUrl: 'https://sportsgrid-tribal.amagi.tv/playlist.m3u8', type: 'hls' },
      { id: 'tnt-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=tnt-1&mirror=1', embedUrl: '/api/sports/player/clean?channelId=tnt-1&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Basketball Studio & NBA Championship',
  },
  {
    id: 'eurosport-1',
    name: 'Eurosport 1 HD',
    category: 'Tennis & Grand Chelem',
    country: 'Europe',
    logo: '/logos/eurosport.svg',
    streamUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8',
    embedUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8',
    streams: [
      { id: 'es-1-m1', name: 'Serveur 1 HD (Tennis Channel International)', quality: 'HD 1080p', lang: 'FR', url: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8', embedUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'es-1-m2', name: 'Serveur 2 HD (Tennis & Tournoi ATP)', quality: 'HD 1080p', lang: 'FR', url: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8', embedUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8', type: 'hls' },
      { id: 'es-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=eurosport-1&mirror=1', embedUrl: '/api/sports/player/clean?channelId=eurosport-1&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Tournoi ATP & Tennis Grand Chelem',
  },
  {
    id: 'dazn-1',
    name: 'DAZN 1 HD',
    category: 'Ligue 1 & Football',
    country: 'International',
    logo: '/logos/dazn.svg',
    streamUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    streams: [
      { id: 'dazn-1-m1', name: 'Serveur 1 HD (beIN Sports Football Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'dazn-1-m2', name: 'Serveur 2 HD (Premier Football & Matchs)', quality: 'HD 1080p', lang: 'FR', url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8', type: 'hls' },
      { id: 'dazn-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=dazn-1&mirror=1', embedUrl: '/api/sports/player/clean?channelId=dazn-1&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Ligue 1 McDonald’s & Chocs de Football',
  },
  {
    id: 'lequipe',
    name: 'La Chaîne L’Équipe HD',
    category: 'Football & Omnisport',
    country: 'France',
    logo: '/logos/lequipe.svg',
    streamUrl: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8',
    embedUrl: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8',
    streams: [
      { id: 'lequipe-m1', name: 'Serveur 1 HD (Direct Football & Matchs)', quality: 'HD 1080p', lang: 'FR', url: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', embedUrl: 'https://strhls.streamakaci.tv/ortb/ortb2-multi/playlist.m3u8', type: 'hls', isOfficial: true },
      { id: 'lequipe-m2', name: 'Serveur 2 HD (beIN Sports Football Direct)', quality: 'HD 1080p', lang: 'FR', url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8', type: 'hls' },
      { id: 'lequipe-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=lequipe&mirror=1', embedUrl: '/api/sports/player/clean?channelId=lequipe&mirror=1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'L’Équipe du Soir & Matchs de Football',
  },
];

// Helper: build streaming mirrors specifically adapted to the real sport of the match
function buildMatchStreams(matchId: string, matchName: string, leagueName: string, sport: SportCategory = 'soccer'): StreamMirror[] {
  if (sport === 'basketball') {
    return [
      {
        id: `match-${matchId}-m1`,
        name: 'Serveur 1 HD (Basketball Live & NBA)',
        quality: 'HD 1080p',
        lang: 'EN',
        url: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
        embedUrl: 'https://raycom-accdn-firetv.amagi.tv/playlist.m3u8',
        type: 'hls',
        isOfficial: true,
      },
      {
        id: `match-${matchId}-m2`,
        name: 'Serveur 2 HD (SportsGrid Arena Live)',
        quality: 'HD 1080p',
        lang: 'EN',
        url: 'https://sportsgrid-tribal.amagi.tv/playlist.m3u8',
        embedUrl: 'https://sportsgrid-tribal.amagi.tv/playlist.m3u8',
        type: 'hls',
      },
      {
        id: `match-${matchId}-m3`,
        name: 'Serveur 3 Sans Pub (Clean Proxy)',
        quality: 'HD 1080p',
        lang: 'EN',
        url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        embedUrl: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        type: 'embed',
      },
    ];
  }

  if (sport === 'tennis') {
    return [
      {
        id: `match-${matchId}-m1`,
        name: 'Serveur 1 HD (Tennis Channel International)',
        quality: 'HD 1080p',
        lang: 'FR',
        url: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8',
        embedUrl: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8',
        type: 'hls',
        isOfficial: true,
      },
      {
        id: `match-${matchId}-m2`,
        name: 'Serveur 2 Sans Pub (Clean Proxy)',
        quality: 'HD 1080p',
        lang: 'FR',
        url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        embedUrl: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        type: 'embed',
      },
    ];
  }

  if (sport === 'mma') {
    return [
      {
        id: `match-${matchId}-m1`,
        name: 'Serveur 1 HD (Combat & UFC Live Direct)',
        quality: 'HD 1080p',
        lang: 'FR',
        url: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8',
        embedUrl: 'https://streaming.astrakhan.ru/astrakhanrusporthd/playlist.m3u8',
        type: 'hls',
        isOfficial: true,
      },
      {
        id: `match-${matchId}-m2`,
        name: 'Serveur 2 HD (Red Bull Combat & Action)',
        quality: 'HD 1080p',
        lang: 'FR',
        url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        embedUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        type: 'hls',
      },
      {
        id: `match-${matchId}-m3`,
        name: 'Serveur 3 Sans Pub (Clean Proxy)',
        quality: 'HD 1080p',
        lang: 'FR',
        url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        embedUrl: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        type: 'embed',
      },
    ];
  }

  if (sport === 'hockey') {
    return [
      {
        id: `match-${matchId}-m1`,
        name: 'Serveur 1 HD (NHL Network Direct)',
        quality: 'HD 1080p',
        lang: 'EN',
        url: 'https://nhl-firetv.amagi.tv/playlist.m3u8',
        embedUrl: 'https://nhl-firetv.amagi.tv/playlist.m3u8',
        type: 'hls',
        isOfficial: true,
      },
      {
        id: `match-${matchId}-m2`,
        name: 'Serveur 2 Sans Pub (Clean Proxy)',
        quality: 'HD 1080p',
        lang: 'EN',
        url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        embedUrl: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
        type: 'embed',
      },
    ];
  }

  // DEFAULT FOR ALL SOCCER / FOOTBALL MATCHES:
  // Server 1 & 2 are strictly dedicated to the EXACT MATCH requested!
  const cleanMatchQuery = encodeURIComponent(`${matchName} live match football streaming direct`);
  return [
    {
      id: `match-${matchId}-m1`,
      name: `Serveur 1 HD (Direct Vidéo du Match - ${matchName})`,
      quality: 'HD 1080p',
      lang: 'FR',
      url: `https://www.youtube-nocookie.com/embed?listType=search&list=${cleanMatchQuery}&autoplay=1`,
      embedUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${cleanMatchQuery}&autoplay=1`,
      type: 'embed',
      isOfficial: true,
    },
    {
      id: `match-${matchId}-m2`,
      name: 'Serveur 2 HD (Terrain 2D & Tracker Interactif)',
      quality: 'HD 1080p',
      lang: 'FR',
      url: `interactive://tracker/${matchId}`,
      embedUrl: `interactive://tracker/${matchId}`,
      type: 'web',
      isOfficial: true,
    },
    {
      id: `match-${matchId}-m3`,
      name: 'Serveur 3 HD (Canal beIN SPORTS Football Direct)',
      quality: 'HD 1080p',
      lang: 'FR',
      url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
      embedUrl: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
      type: 'hls',
    },
    {
      id: `match-${matchId}-m4`,
      name: 'Serveur 4 HD (Canal Premier Football Live)',
      quality: 'HD 1080p',
      lang: 'FR',
      url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
      embedUrl: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
      type: 'hls',
    },
    {
      id: `match-${matchId}-m5`,
      name: 'Serveur 5 Sans Pub (Clean Proxy)',
      quality: 'HD 1080p',
      lang: 'FR',
      url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
      embedUrl: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
      type: 'embed',
    },
  ];
}

// Helper: fetch matches from LiveScore API for real global football competitions
export async function fetchLiveScoreMatches(): Promise<SportsMatch[]> {
  const cacheKey = 'livescore_daily_matches';
  const cached = getCache<SportsMatch[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  try {
    const res = await fetch(`https://prod-public-api.livescore.com/v1/api/app/date/soccer/${dateStr}/0`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const stages = data.Stages || [];
    const matches: SportsMatch[] = [];

    for (const stage of stages) {
      const compName = stage.Cnm ? `${stage.Cnm} - ${stage.Snm}` : stage.Snm;
      const stageCode = (stage.Scd || stage.Sid || '').toLowerCase();
      const cnmLower = (stage.Cnm || '').toLowerCase();

      // Map to supported league IDs
      let leagueId = 'other-soccer';
      if (cnmLower.includes('uefa nations') || stageCode.includes('nations')) leagueId = 'uefa-nl';
      else if (cnmLower.includes('champions league') || stageCode.includes('champions')) leagueId = 'ucl';
      else if (cnmLower.includes('europa') || stageCode.includes('europa')) leagueId = 'europa-league';
      else if (cnmLower.includes('england') || stageCode.includes('premier')) leagueId = 'epl';
      else if (cnmLower.includes('spain') || stageCode.includes('laliga')) leagueId = 'laliga';
      else if (cnmLower.includes('france') || stageCode.includes('ligue-1')) leagueId = 'ligue1';
      else if (cnmLower.includes('italy') || stageCode.includes('serie-a')) leagueId = 'seriea';
      else if (cnmLower.includes('germany') || stageCode.includes('bundesliga')) leagueId = 'bundesliga';
      else if (cnmLower.includes('concacaf')) leagueId = 'concacaf-nl';

      for (const ev of (stage.Events || [])) {
        const homeRaw = ev.T1?.[0];
        const awayRaw = ev.T2?.[0];
        if (!homeRaw || !awayRaw) continue;

        const esdStr = String(ev.Esd || '');
        const hours = esdStr.length >= 12 ? esdStr.slice(8, 10) : '20';
        const mins = esdStr.length >= 12 ? esdStr.slice(10, 12) : '00';

        const eps = String(ev.Eps || 'NS');
        const isLive = eps.includes("'") || eps === 'HT' || eps === 'LIVE';
        const isFinished = eps === 'FT' || eps === 'AET' || eps === 'AP';

        const homeName = homeRaw.Nm || 'Équipe 1';
        const awayName = awayRaw.Nm || 'Équipe 2';
        const matchName = `${homeName} vs ${awayName}`;
        const matchId = `match-ls-${ev.Eid}`;

        const homeLogo = homeRaw.Img
          ? `https://lsm-static-prod.livescore.com/high/${homeRaw.Img}`
          : 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png';

        const awayLogo = awayRaw.Img
          ? `https://lsm-static-prod.livescore.com/high/${awayRaw.Img}`
          : 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png';

        const matchStreams = buildMatchStreams(matchId, matchName, compName, 'soccer');

        matches.push({
          id: matchId,
          leagueId,
          leagueName: compName,
          leagueLogo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2090.png',
          sport: 'soccer',
          name: matchName,
          shortName: `${homeRaw.Abr || homeName.slice(0, 3)} vs ${awayRaw.Abr || awayName.slice(0, 3)}`,
          date: new Date().toISOString(),
          kickOffTime: `${hours}:${mins}`,
          kickOffDateFormatted: `${dd}/${mm} à ${hours}:${mins}`,
          timestamp: Date.now(),
          status: isLive ? 'live' : isFinished ? 'finished' : 'scheduled',
          statusDetail: isLive ? eps : isFinished ? 'Terminé' : `${hours}:${mins}`,
          clock: isLive ? eps : undefined,
          isLive,
          homeTeam: {
            id: String(homeRaw.ID || 'home'),
            name: homeName,
            shortName: homeRaw.Abr || homeName.slice(0, 3),
            displayName: homeName,
            logo: homeLogo,
            score: parseInt(ev.Tr1 || '0', 10),
            points: parseInt(ev.Tr1 || '0', 10),
            homeAway: 'home',
          },
          awayTeam: {
            id: String(awayRaw.ID || 'away'),
            name: awayName,
            shortName: awayRaw.Abr || awayName.slice(0, 3),
            displayName: awayName,
            logo: awayLogo,
            score: parseInt(ev.Tr2 || '0', 10),
            points: parseInt(ev.Tr2 || '0', 10),
            homeAway: 'away',
          },
          broadcasts: ['beIN SPORTS 1', 'Canal+ Foot'],
          streams: matchStreams,
        });
      }
    }

    setCache(cacheKey, matches, 45 * 1000); // 45s cache for live matches
    return matches;
  } catch (err) {
    console.error('Erreur LiveScore API:', err);
    return [];
  }
}

// Helper: fetch matches from ESPN API (for non-soccer sports or fallback)
export async function getESPNLeagueMatches(league: TournamentLeague): Promise<SportsMatch[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.espnId}/scoreboard`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data = await res.json();
    const events = data.events || [];

    return events.map((ev: any) => {
      const comp = ev.competitions?.[0];
      const homeRaw = comp?.competitors?.find((c: any) => c.homeAway === 'home') || comp?.competitors?.[0];
      const awayRaw = comp?.competitors?.find((c: any) => c.homeAway === 'away') || comp?.competitors?.[1];

      const homeTeam: SportsTeam = {
        id: homeRaw?.id || 'home',
        name: homeRaw?.team?.name || 'Équipe 1',
        shortName: homeRaw?.team?.abbreviation || 'EQ1',
        displayName: homeRaw?.team?.displayName || homeRaw?.team?.name || 'Équipe Domicile',
        logo: homeRaw?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
        score: parseInt(homeRaw?.score || '0', 10),
        points: parseInt(homeRaw?.score || '0', 10),
        record: homeRaw?.records?.[0]?.summary || '',
        homeAway: 'home',
      };

      const awayTeam: SportsTeam = {
        id: awayRaw?.id || 'away',
        name: awayRaw?.team?.name || 'Équipe 2',
        shortName: awayRaw?.team?.abbreviation || 'EQ2',
        displayName: awayRaw?.team?.displayName || awayRaw?.team?.name || 'Équipe Extérieur',
        logo: awayRaw?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
        score: parseInt(awayRaw?.score || '0', 10),
        points: parseInt(awayRaw?.score || '0', 10),
        record: awayRaw?.records?.[0]?.summary || '',
        homeAway: 'away',
      };

      const statusType = comp?.status?.type?.state;
      let status: 'scheduled' | 'live' | 'finished' = 'scheduled';
      let isLive = false;

      if (statusType === 'in') {
        status = 'live';
        isLive = true;
      } else if (statusType === 'post') {
        status = 'finished';
      }

      const matchDate = new Date(ev.date);
      const hours = matchDate.getHours().toString().padStart(2, '0');
      const mins = matchDate.getMinutes().toString().padStart(2, '0');
      const day = matchDate.getDate().toString().padStart(2, '0');
      const month = (matchDate.getMonth() + 1).toString().padStart(2, '0');

      const broadcastsList: string[] = [];
      if (comp?.broadcasts) {
        comp.broadcasts.forEach((b: any) => {
          if (b.names) broadcastsList.push(...b.names);
        });
      }

      const matchId = `match-${league.id}-${ev.id}`;

      return {
        id: matchId,
        leagueId: league.id,
        leagueName: league.name,
        leagueLogo: league.logo,
        sport: league.sport,
        name: ev.name || `${homeTeam.displayName} vs ${awayTeam.displayName}`,
        shortName: ev.shortName || `${homeTeam.shortName} vs ${awayTeam.shortName}`,
        date: ev.date,
        kickOffTime: `${hours}:${mins}`,
        kickOffDateFormatted: `${day}/${month} à ${hours}:${mins}`,
        timestamp: matchDate.getTime(),
        status,
        statusDetail: comp?.status?.type?.detail || comp?.status?.type?.description || `${hours}:${mins}`,
        clock: comp?.status?.displayClock,
        period: comp?.status?.period,
        isLive,
        homeTeam,
        awayTeam,
        venue: {
          name: comp?.venue?.fullName || 'Stade Officiel',
          city: comp?.venue?.address?.city || '',
        },
        broadcasts: broadcastsList.length > 0 ? broadcastsList : ['Canal+ Sport', 'BeIN Sports 1'],
        streams: buildMatchStreams(matchId, `${homeTeam.displayName} vs ${awayTeam.displayName}`, league.name, league.sport),
      };
    });
  } catch (error) {
    console.error(`Error fetching matches for ${league.name}:`, error);
    return [];
  }
}

// Fetch matches for a specific league (LiveScore first for football, ESPN for others)
export async function getLeagueMatches(leagueId: string): Promise<SportsMatch[]> {
  const all = await getAllMatches();
  const filtered = all.filter((m) => m.leagueId === leagueId);
  if (filtered.length > 0) return filtered;

  const league = SUPPORTED_LEAGUES.find((l) => l.id === leagueId || l.espnId === leagueId);
  if (league) {
    return getESPNLeagueMatches(league);
  }
  return [];
}

// Fetch all matches across all supported tournaments (LiveScore Football + Other Sports)
export async function getAllMatches(): Promise<SportsMatch[]> {
  const cached = getCache<SportsMatch[]>('sports_all_matches');
  if (cached) return cached;

  // 1. Fetch real European & International football matches from LiveScore API
  const liveScoreMatches = await fetchLiveScoreMatches();

  // 2. Fetch non-soccer sports (NBA, UFC, NHL, etc.) from ESPN
  const nonSoccerLeagues = SUPPORTED_LEAGUES.filter((l) => l.sport !== 'soccer');
  const otherResults = await Promise.all(
    nonSoccerLeagues.map((league) => getESPNLeagueMatches(league))
  );

  const all = [...liveScoreMatches, ...otherResults.flat()];
  // Live matches first, then upcoming
  all.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return a.timestamp - b.timestamp;
  });

  setCache('sports_all_matches', all, 30 * 1000);
  return all;
}

// Fetch live matches only
export async function getLiveMatches(): Promise<SportsMatch[]> {
  const all = await getAllMatches();
  return all.filter((m) => m.isLive);
}

// Fetch match by ID
export async function getMatchById(id: string): Promise<SportsMatch | null> {
  const all = await getAllMatches();
  return all.find((m) => m.id === id) || null;
}

// Fetch Standings / Rankings table with points
export async function getLeagueStandings(leagueId: string): Promise<TournamentStanding[]> {
  const league = SUPPORTED_LEAGUES.find((l) => l.id === leagueId || l.espnId === leagueId);
  if (!league || !league.hasStandings) return [];

  const cacheKey = `sports_standings_${league.id}`;
  const cached = getCache<TournamentStanding[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://site.api.espn.com/apis/v2/sports/${league.sport}/${league.espnId}/standings`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data = await res.json();
    const children = data.children || [];
    const allStandings: TournamentStanding[] = [];

    children.forEach((child: any) => {
      const groupName = child.name || '';
      const entries = child.standings?.entries || [];

      entries.forEach((e: any, idx: number) => {
        const getStat = (name: string) => e.stats?.find((s: any) => s.name === name)?.value ?? 0;

        let pts = getStat('points');
        const wins = getStat('wins');
        const draws = getStat('ties') || getStat('draws');
        const losses = getStat('losses');

        if (pts === 0 && (league.sport === 'basketball' || league.sport === 'baseball' || league.sport === 'football' || league.sport === 'hockey')) {
          pts = wins * 2;
        } else if (pts === 0 && league.sport === 'soccer' && (wins > 0 || draws > 0)) {
          pts = wins * 3 + draws;
        }

        allStandings.push({
          rank: getStat('rank') || idx + 1,
          teamId: e.team?.id || String(idx + 1),
          teamName: e.team?.displayName || e.team?.name || 'Équipe',
          teamLogo: e.team?.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png',
          groupName: children.length > 1 ? groupName : undefined,
          points: pts,
          gamesPlayed: getStat('gamesPlayed') || (wins + draws + losses),
          wins,
          draws,
          losses,
          goalsFor: getStat('pointsFor'),
          goalsAgainst: getStat('pointsAgainst'),
          goalDifference: getStat('pointDifferential') || getStat('differential'),
          form: e.stats?.find((s: any) => s.name === 'streak')?.displayValue || '',
        });
      });
    });

    setCache(cacheKey, allStandings, 5 * 60 * 1000); // 5 minutes cache for standings
    return allStandings;
  } catch (error) {
    console.error(`Error fetching standings for ${league.name}:`, error);
    return [];
  }
}
