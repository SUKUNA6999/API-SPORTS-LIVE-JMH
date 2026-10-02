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

// 24/7 Sports TV Channels with authentic logos & resilient multi-mirrors
export const SPORTS_CHANNELS: SportsChannel[] = [
  {
    id: 'bein-1',
    name: 'BeIN SPORTS 1 HD',
    category: 'Football & Omnisport',
    country: 'France',
    logo: '/logos/bein1.svg',
    streamUrl: '/api/sports/player/clean?channelId=bein-1',
    embedUrl: 'https://topembed.pw/channel/beIN_SPORTS_1_FR',
    streams: [
      { id: 'bein-1-m1', name: 'Serveur 1 HD (Flux Principal)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=bein-1&mirror=1', embedUrl: 'https://topembed.pw/channel/beIN_SPORTS_1_FR', type: 'embed' },
      { id: 'bein-1-m2', name: 'Serveur 2 VIP (Secours Direct)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=bein-1&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=bein1fr', type: 'embed' },
      { id: 'bein-1-m3', name: 'Serveur 3 Global (SportsBox)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=bein-1&mirror=3', embedUrl: 'https://sportsbox.live/embed/bein1', type: 'embed' },
      { id: 'bein-1-m4', name: 'Serveur 4 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=bein-1&mirror=4', embedUrl: '/api/sports/player/clean?channelId=bein-1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Ligue des Champions & Soirée Direct',
  },
  {
    id: 'canal-foot',
    name: 'Canal+ Foot HD',
    category: 'Football Européen',
    country: 'France',
    logo: '/logos/canalfoot.svg',
    streamUrl: '/api/sports/player/clean?channelId=canal-foot',
    embedUrl: 'https://topembed.pw/channel/Canal_Plus_Foot',
    streams: [
      { id: 'cp-foot-m1', name: 'Serveur 1 HD (Canal Direct)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=canal-foot&mirror=1', embedUrl: 'https://topembed.pw/channel/Canal_Plus_Foot', type: 'embed' },
      { id: 'cp-foot-m2', name: 'Serveur 2 VIP (Secours HD)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=canal-foot&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=canalplusfoot', type: 'embed' },
      { id: 'cp-foot-m3', name: 'Serveur 3 Multi-Langues', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=canal-foot&mirror=3', embedUrl: 'https://sportsbox.live/embed/canalfoot', type: 'embed' },
      { id: 'cp-foot-m4', name: 'Serveur 4 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=canal-foot&mirror=4', embedUrl: '/api/sports/player/clean?channelId=canal-foot', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Premier League & Grand Match',
  },
  {
    id: 'rmc-1',
    name: 'RMC Sport 1 HD',
    category: 'Combat & Football',
    country: 'France',
    logo: '/logos/rmcsport1.svg',
    streamUrl: '/api/sports/player/clean?channelId=rmc-1',
    embedUrl: 'https://topembed.pw/channel/RMC_Sport_1',
    streams: [
      { id: 'rmc-1-m1', name: 'Serveur 1 HD (UFC & Combat)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=rmc-1&mirror=1', embedUrl: 'https://topembed.pw/channel/RMC_Sport_1', type: 'embed' },
      { id: 'rmc-1-m2', name: 'Serveur 2 VIP (Secours Direct)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=rmc-1&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=rmcsport1', type: 'embed' },
      { id: 'rmc-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=rmc-1&mirror=3', embedUrl: '/api/sports/player/clean?channelId=rmc-1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'UFC Main Card & Conférence',
  },
  {
    id: 'sky-pl',
    name: 'Sky Sports Premier League',
    category: 'Premier League',
    country: 'Royaume-Uni',
    logo: '/logos/skysports.svg',
    streamUrl: '/api/sports/player/clean?channelId=sky-pl',
    embedUrl: 'https://topembed.pw/channel/Sky_Sports_Premier_League',
    streams: [
      { id: 'sky-pl-m1', name: 'Serveur 1 HD (UK Feed)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=sky-pl&mirror=1', embedUrl: 'https://topembed.pw/channel/Sky_Sports_Premier_League', type: 'embed' },
      { id: 'sky-pl-m2', name: 'Serveur 2 VIP (Secours HD)', quality: 'HD 720p', lang: 'EN', url: '/api/sports/player/clean?channelId=sky-pl&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=skysportspl', type: 'embed' },
      { id: 'sky-pl-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=sky-pl&mirror=3', embedUrl: '/api/sports/player/clean?channelId=sky-pl', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Super Sunday Live Broadcast',
  },
  {
    id: 'tnt-1',
    name: 'TNT Sports 1 HD',
    category: 'Champions League & NBA',
    country: 'Royaume-Uni',
    logo: '/logos/tntsports.svg',
    streamUrl: '/api/sports/player/clean?channelId=tnt-1',
    embedUrl: 'https://topembed.pw/channel/TNT_Sports_1',
    streams: [
      { id: 'tnt-1-m1', name: 'Serveur 1 HD (TNT Live)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=tnt-1&mirror=1', embedUrl: 'https://topembed.pw/channel/TNT_Sports_1', type: 'embed' },
      { id: 'tnt-1-m2', name: 'Serveur 2 VIP (NBA & UCL)', quality: 'HD 720p', lang: 'EN', url: '/api/sports/player/clean?channelId=tnt-1&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=tntsports1', type: 'embed' },
      { id: 'tnt-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'EN', url: '/api/sports/player/clean?channelId=tnt-1&mirror=3', embedUrl: '/api/sports/player/clean?channelId=tnt-1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Champions League Studio & NBA',
  },
  {
    id: 'eurosport-1',
    name: 'Eurosport 1 HD',
    category: 'Tennis & Sports d’hiver',
    country: 'Europe',
    logo: '/logos/eurosport.svg',
    streamUrl: '/api/sports/player/clean?channelId=eurosport-1',
    embedUrl: 'https://topembed.pw/channel/Eurosport_1_FR',
    streams: [
      { id: 'es-1-m1', name: 'Serveur 1 HD (Grand Chelem)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=eurosport-1&mirror=1', embedUrl: 'https://topembed.pw/channel/Eurosport_1_FR', type: 'embed' },
      { id: 'es-1-m2', name: 'Serveur 2 VIP (ATP & Tournoi)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=eurosport-1&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=eurosport1fr', type: 'embed' },
      { id: 'es-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=eurosport-1&mirror=3', embedUrl: '/api/sports/player/clean?channelId=eurosport-1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Tournoi ATP & Grand Chelem',
  },
  {
    id: 'dazn-1',
    name: 'DAZN 1 HD',
    category: 'Ligue 1 & Boxe',
    country: 'International',
    logo: '/logos/dazn.svg',
    streamUrl: '/api/sports/player/clean?channelId=dazn-1',
    embedUrl: 'https://topembed.pw/channel/DAZN_1_FR',
    streams: [
      { id: 'dazn-1-m1', name: 'Serveur 1 HD (Ligue 1 & Boxe)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=dazn-1&mirror=1', embedUrl: 'https://topembed.pw/channel/DAZN_1_FR', type: 'embed' },
      { id: 'dazn-1-m2', name: 'Serveur 2 VIP (Combat HD)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=dazn-1&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=dazn1fr', type: 'embed' },
      { id: 'dazn-1-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=dazn-1&mirror=3', embedUrl: '/api/sports/player/clean?channelId=dazn-1', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'Ligue 1 McDonald’s & Chocs de Boxe',
  },
  {
    id: 'lequipe',
    name: 'La Chaîne L’Équipe HD',
    category: 'Omnisport & Débats',
    country: 'France',
    logo: '/logos/lequipe.svg',
    streamUrl: '/api/sports/player/clean?channelId=lequipe',
    embedUrl: 'https://topembed.pw/channel/L_Equipe_TV',
    streams: [
      { id: 'lequipe-m1', name: 'Serveur 1 HD (Direct France)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=lequipe&mirror=1', embedUrl: 'https://topembed.pw/channel/L_Equipe_TV', type: 'embed' },
      { id: 'lequipe-m2', name: 'Serveur 2 VIP (Secours HD)', quality: 'HD 720p', lang: 'FR', url: '/api/sports/player/clean?channelId=lequipe&mirror=2', embedUrl: 'https://vidsrc.me/embed/tv?channel=lequipetv', type: 'embed' },
      { id: 'lequipe-m3', name: 'Serveur 3 Sans Pub (Clean Proxy)', quality: 'HD 1080p', lang: 'FR', url: '/api/sports/player/clean?channelId=lequipe&mirror=3', embedUrl: '/api/sports/player/clean?channelId=lequipe', type: 'embed' },
    ],
    status: 'online',
    currentProgram: 'L’Équipe du Soir & Direct Omnisport',
  },
];

// Helper: build streaming mirrors for any match
function buildMatchStreams(matchId: string, matchName: string, leagueName: string): StreamMirror[] {
  const cleanTitle = encodeURIComponent(matchName);
  return [
    {
      id: 'mirror-hd-1',
      name: 'Serveur 1 HD (Flux Principal Sans Pub)',
      quality: 'HD 1080p',
      lang: 'FR',
      url: `/api/sports/player/clean?matchId=${matchId}&mirror=1`,
      embedUrl: `https://embedsports.me/match/${matchId}?title=${cleanTitle}`,
      type: 'embed',
      isOfficial: true,
    },
    {
      id: 'mirror-hd-2',
      name: 'Serveur 2 HD (Miroir Rapide Multi-Langues)',
      quality: 'HD 720p',
      lang: 'Multi',
      url: `/api/sports/player/clean?matchId=${matchId}&mirror=2`,
      embedUrl: `https://vidsrc.me/embed/sports?match=${matchId}&name=${cleanTitle}`,
      type: 'embed',
    },
    {
      id: 'mirror-hd-3',
      name: 'Serveur 3 HD (VIP Sports Network)',
      quality: 'HD 1080p',
      lang: 'EN',
      url: `/api/sports/player/clean?matchId=${matchId}&mirror=3`,
      embedUrl: `https://sportsbox.live/embed/${matchId}`,
      type: 'embed',
    },
    {
      id: 'mirror-hd-4',
      name: 'Serveur 4 4K (Ultra Haute Définition)',
      quality: '4K',
      lang: 'FR',
      url: `/api/sports/player/clean?matchId=${matchId}&mirror=4`,
      embedUrl: `https://topembed.pw/match/${matchId}`,
      type: 'embed',
    },
  ];
}

// Fetch matches for a specific league
export async function getLeagueMatches(leagueId: string): Promise<SportsMatch[]> {
  const league = SUPPORTED_LEAGUES.find((l) => l.id === leagueId || l.espnId === leagueId);
  if (!league) return [];

  const cacheKey = `sports_matches_${league.id}`;
  const cached = getCache<SportsMatch[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.espnId}/scoreboard`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];

    const data = await res.json();
    const events = data.events || [];

    const matches: SportsMatch[] = events.map((ev: any) => {
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

      const statusType = comp?.status?.type?.state; // 'pre', 'in', 'post'
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
        streams: buildMatchStreams(matchId, `${homeTeam.displayName} vs ${awayTeam.displayName}`, league.name),
      };
    });

    setCache(cacheKey, matches, 45 * 1000); // 45s cache for live data
    return matches;
  } catch (error) {
    console.error(`Error fetching matches for ${league.name}:`, error);
    return [];
  }
}

// Fetch all matches across all supported tournaments
export async function getAllMatches(): Promise<SportsMatch[]> {
  const cached = getCache<SportsMatch[]>('sports_all_matches');
  if (cached) return cached;

  const results = await Promise.all(
    SUPPORTED_LEAGUES.map((league) => getLeagueMatches(league.id))
  );

  const all = results.flat();
  // Sort by timestamp
  all.sort((a, b) => a.timestamp - b.timestamp);

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
