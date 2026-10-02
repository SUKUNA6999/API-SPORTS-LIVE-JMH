import { Router, Request, Response, NextFunction } from 'express';
import {
  SUPPORTED_LEAGUES,
  SPORTS_CHANNELS,
  getAllMatches,
  getLeagueMatches,
  getLiveMatches,
  getMatchById,
  getLeagueStandings,
} from './service';
import {
  generateSportsApiKey,
  getAllSportsKeys,
  validateAndTrackKey,
  revokeSportsKey,
} from './keyService';

export const sportsRouter = Router();

// Middleware to track API key usage if provided
sportsRouter.use((req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] || req.query.apiKey || req.headers.authorization?.replace(/^Bearer\s+/i, '')) as string;
  if (apiKey) {
    const result = validateAndTrackKey(apiKey);
    if (!result.valid && !req.path.startsWith('/keys') && !req.path.startsWith('/player')) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_API_KEY',
        message: result.error,
        help: 'Générez une clé gratuite ou pro via POST /api/sports/keys/generate ou depuis la page Sports Arena.',
      });
    }
    // Attach validated key item to request
    (req as any).sportsApiKey = result.keyItem;
  }
  next();
});

// -------------------------------------------------------------
// 0. API KEY MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
sportsRouter.get('/keys', (_req: Request, res: Response) => {
  const keys = getAllSportsKeys();
  res.json({
    status: 'success',
    count: keys.length,
    keys,
  });
});

sportsRouter.post('/keys/generate', (req: Request, res: Response) => {
  const { label, username, tier } = req.body || {};
  const newKey = generateSportsApiKey(label || 'Mon Application Sport Live', username || 'developpeur', tier || 'pro');

  res.status(201).json({
    status: 'success',
    message: 'Clé API générée avec succès ! Incluez cette clé dans l’en-tête "x-api-key" ou dans le paramètre "?apiKey="',
    key: newKey,
    documentation: {
      headerUsage: `curl -H "x-api-key: ${newKey.key}" http://localhost:3000/api/sports/matches`,
      queryUsage: `http://localhost:3000/api/sports/matches?apiKey=${newKey.key}`,
    },
  });
});

sportsRouter.post('/keys/validate', (req: Request, res: Response) => {
  const { key } = req.body || {};
  const result = validateAndTrackKey(key);
  if (!result.valid) {
    return res.status(400).json({ status: 'error', valid: false, message: result.error });
  }

  res.json({
    status: 'success',
    valid: true,
    key: result.keyItem,
  });
});

sportsRouter.delete('/keys/:key', (req: Request, res: Response) => {
  const success = revokeSportsKey(req.params.key);
  if (!success) {
    return res.status(404).json({ status: 'error', message: 'Clé introuvable' });
  }
  res.json({ status: 'success', message: 'Clé API révoquée avec succès' });
});

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
sportsRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'API-SPORTS-LIVE-JMH',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supportedLeaguesCount: SUPPORTED_LEAGUES.length,
    channelsCount: SPORTS_CHANNELS.length,
    activeKeysCount: getAllSportsKeys().length,
  });
});

// -------------------------------------------------------------
// STREAM NETWORK PROBE & DIAGNOSTICS
// -------------------------------------------------------------
sportsRouter.get('/stream/probe', async (req: Request, res: Response) => {
  const streamUrl = String(req.query.url || '');
  if (!streamUrl || !streamUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL invalide (doit commencer par http/https)' });
  }

  const start = Date.now();
  try {
    const probeRes = await fetch(streamUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(4500),
    });

    const latencyMs = Date.now() - start;
    const contentType = probeRes.headers.get('content-type') || '';
    const frameOptions = probeRes.headers.get('x-frame-options');
    const csp = probeRes.headers.get('content-security-policy') || '';

    const isHls = streamUrl.includes('.m3u8') || contentType.includes('mpegurl');
    const isFrameRestricted = !!frameOptions || csp.includes('frame-ancestors');

    res.json({
      ok: probeRes.ok,
      status: probeRes.status,
      statusText: probeRes.statusText || (probeRes.ok ? 'OK' : 'Error'),
      latencyMs,
      contentType,
      isHls,
      isFrameRestricted,
      frameOptions: frameOptions || null,
      recommendation: isHls ? 'video-hls' : isFrameRestricted ? 'external-tab' : 'iframe',
    });
  } catch (error: any) {
    res.json({
      ok: false,
      status: 0,
      statusText: error.name === 'TimeoutError' ? 'Délai d’attente dépassé (Timeout)' : (error.message || 'Erreur réseau'),
      latencyMs: Date.now() - start,
      contentType: '',
      isHls: streamUrl.includes('.m3u8'),
      isFrameRestricted: true,
      recommendation: 'next-mirror',
    });
  }
});

// -------------------------------------------------------------
// 1. TOURNAMENTS & LEAGUES LIST
// -------------------------------------------------------------
sportsRouter.get('/tournaments', async (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    total: SUPPORTED_LEAGUES.length,
    tournaments: SUPPORTED_LEAGUES,
  });
});

// -------------------------------------------------------------
// 2. ALL MATCHES (WITH FILTERS)
// -------------------------------------------------------------
sportsRouter.get('/matches', async (req: Request, res: Response) => {
  const { league, sport, status } = req.query;

  let matches = league ? await getLeagueMatches(String(league)) : await getAllMatches();

  if (sport) {
    matches = matches.filter((m) => m.sport === sport);
  }

  if (status === 'live') {
    matches = matches.filter((m) => m.isLive);
  } else if (status === 'upcoming') {
    matches = matches.filter((m) => m.status === 'scheduled');
  } else if (status === 'finished') {
    matches = matches.filter((m) => m.status === 'finished');
  }

  res.json({
    status: 'success',
    total: matches.length,
    matches,
  });
});

// -------------------------------------------------------------
// 3. LIVE MATCHES (CURRENTLY PLAYING RIGHT NOW)
// -------------------------------------------------------------
sportsRouter.get('/matches/live', async (_req: Request, res: Response) => {
  const liveMatches = await getLiveMatches();
  res.json({
    status: 'success',
    count: liveMatches.length,
    matches: liveMatches,
  });
});

// -------------------------------------------------------------
// 4. MATCH DETAIL BY ID
// -------------------------------------------------------------
sportsRouter.get('/match/:id', async (req: Request, res: Response) => {
  const match = await getMatchById(req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match non trouvé' });
  }

  res.json({
    status: 'success',
    match,
  });
});

// -------------------------------------------------------------
// 5. STANDINGS / POINTS CLASSEMENT
// -------------------------------------------------------------
sportsRouter.get('/standings/:league', async (req: Request, res: Response) => {
  const standings = await getLeagueStandings(req.params.league);
  res.json({
    status: 'success',
    league: req.params.league,
    count: standings.length,
    standings,
  });
});

// -------------------------------------------------------------
// 6. 24/7 LIVE SPORTS TV CHANNELS
// -------------------------------------------------------------
sportsRouter.get('/channels', async (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    count: SPORTS_CHANNELS.length,
    channels: SPORTS_CHANNELS,
  });
});

// -------------------------------------------------------------
// 7. WATCH MATCH / GET STREAMS
// -------------------------------------------------------------
sportsRouter.get('/watch/:id', async (req: Request, res: Response) => {
  const match = await getMatchById(req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match non trouvé' });
  }

  res.json({
    status: 'success',
    matchId: match.id,
    matchName: match.name,
    league: match.leagueName,
    kickOffTime: match.kickOffTime,
    isLive: match.isLive,
    scores: {
      home: match.homeTeam.score,
      away: match.awayTeam.score,
    },
    cleanPlayerUrl: `/api/sports/player/clean?matchId=${match.id}`,
    streams: match.streams,
  });
});

// -------------------------------------------------------------
// 8. CLEAN AD-FREE HTML5 VIDEO PLAYER FOR ANY MATCH OR CHANNEL
// -------------------------------------------------------------
sportsRouter.get('/player/clean', async (req: Request, res: Response) => {
  const { matchId, channelId, mirror } = req.query;

  let title = 'Live Sports Stream';
  let homeName = '';
  let awayName = '';
  let homeScore = 0;
  let awayScore = 0;
  let homeLogo = '';
  let awayLogo = '';
  let leagueName = 'Tournoi Sportif';
  let isLive = false;
  let streams: any[] = [];
  let currentMirrorIndex = mirror ? parseInt(String(mirror), 10) - 1 : 0;
  if (currentMirrorIndex < 0) currentMirrorIndex = 0;

  if (matchId) {
    const match = await getMatchById(String(matchId));
    if (match) {
      title = match.name;
      homeName = match.homeTeam.displayName;
      awayName = match.awayTeam.displayName;
      homeScore = match.homeTeam.score;
      awayScore = match.awayTeam.score;
      homeLogo = match.homeTeam.logo;
      awayLogo = match.awayTeam.logo;
      leagueName = match.leagueName;
      isLive = match.isLive;
      streams = match.streams;
    }
  } else if (channelId) {
    const channel = SPORTS_CHANNELS.find((c) => c.id === channelId);
    if (channel) {
      title = channel.name;
      leagueName = channel.category;
      isLive = true;
      streams = channel.streams && channel.streams.length > 0 ? channel.streams : [
        {
          id: 'channel-embed-1',
          name: 'Direct HD 1080p',
          quality: 'HD 1080p',
          lang: 'FR',
          embedUrl: channel.embedUrl,
        },
      ];
    }
  }

  const selectedStream = streams[currentMirrorIndex] || streams[0];
  const embedSrc = selectedStream?.embedUrl || selectedStream?.url || 'https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8';
  const isHls = embedSrc.includes('.m3u8') || selectedStream?.type === 'hls';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');

  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - JMH Sports Live Player (Sans Pub)</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #05070a; overflow: hidden; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #fff; }
    .top-bar { height: 56px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 50; flex-shrink: 0; }
    .match-info { display: flex; align-items: center; gap: 12px; overflow: hidden; }
    .team-badge { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; }
    .team-logo { width: 24px; height: 24px; object-fit: contain; }
    .score-badge { background: #0284c7; color: #fff; font-weight: 900; font-size: 14px; padding: 3px 10px; border-radius: 6px; letter-spacing: 1px; }
    .live-pulse { display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; flex-shrink: 0; }
    .live-pulse span { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; }
    .mirrors-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .mirror-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.2s; }
    .mirror-btn:hover { background: #334155; color: #fff; }
    .mirror-btn.active { background: #10b981; color: #022c22; font-weight: 900; border-color: #34d399; }
    .player-wrap { position: relative; flex: 1; width: 100%; height: calc(100% - 150px); background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    iframe { width: 100%; height: 100%; border: none; background: #000; }
    .log-bar { height: 94px; background: #090d16; border-top: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; font-family: monospace; font-size: 11px; color: #94a3b8; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .log-entry { line-height: 1.4; }
    .log-success { color: #34d399; }
    .log-error { color: #f87171; }
    .log-warn { color: #fbbf24; }
    .log-info { color: #38bdf8; }
    .floating-tools { position: absolute; bottom: 12px; right: 16px; z-index: 99; display: flex; gap: 8px; }
    .tool-btn { background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 8px; text-decoration: none; cursor: pointer; }
    .tool-btn:hover { background: #1e293b; }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="match-info">
      ${isLive ? '<div class="live-pulse"><span></span> EN DIRECT</div>' : ''}
      <span style="color:#94a3b8;font-size:12px;font-weight:700">${leagueName} :</span>

      ${homeName ? `
        <div class="team-badge">
          ${homeLogo ? `<img src="${homeLogo}" class="team-logo" />` : ''}
          <span>${homeName}</span>
        </div>
        <div class="score-badge">${homeScore} - ${awayScore}</div>
        <div class="team-badge">
          ${awayLogo ? `<img src="${awayLogo}" class="team-logo" />` : ''}
          <span>${awayName}</span>
        </div>
      ` : `
        <span style="font-weight:800;font-size:14px;color:#fff">${title}</span>
      `}
    </div>

    ${streams.length > 1 ? `
    <div class="mirrors-group">
      <span style="color:#94a3b8;font-size:11px;font-weight:bold;margin-right:2px">SERVEURS :</span>
      ${streams.map((s, idx) => `
        <a
          href="/api/sports/player/clean?matchId=${matchId || ''}&channelId=${channelId || ''}&mirror=${idx + 1}"
          class="mirror-btn ${idx === currentMirrorIndex ? 'active' : ''}"
        >
          ${s.name || `Miroir ${idx + 1}`}
        </a>
      `).join('')}
    </div>
    ` : ''}
  </div>

  <div class="player-wrap">
    ${isHls ? `
      <video id="sportsVideo" playsinline autoplay muted controls></video>
    ` : `
      <iframe
        id="sportsIframe"
        src="${embedSrc}"
        referrerpolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen
      ></iframe>
    `}

    <div class="floating-tools">
      <a href="${embedSrc}" target="_blank" rel="noreferrer" class="tool-btn">Ouvrir Flux Direct ↗</a>
    </div>
  </div>

  <div class="log-bar" id="logTerminal">
    <div class="log-entry log-info">[INIT] Lecteur Live Pro initialisé pour: ${title}</div>
    <div class="log-entry log-info">[URL] Source: ${embedSrc}</div>
    <div class="log-entry log-info">[ENGINE] Mode: ${isHls ? 'Hls.js Video Engine' : 'Iframe Player'}</div>
  </div>

  <script>
    function log(type, msg) {
      var terminal = document.getElementById('logTerminal');
      if (!terminal) return;
      var d = new Date().toLocaleTimeString();
      var div = document.createElement('div');
      div.className = 'log-entry log-' + type;
      div.textContent = '[' + d + '] [' + type.toUpperCase() + '] ' + msg;
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
    }

    var isHls = ${JSON.stringify(isHls)};
    var streamUrl = ${JSON.stringify(embedSrc)};

    if (isHls) {
      var video = document.getElementById('sportsVideo');
      if (Hls.isSupported()) {
        log('info', 'Hls.js supporté. Chargement du flux...');
        var hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function(e, data) {
          log('success', 'Manifeste HLS validé avec succès (' + data.levels.length + ' niveaux de résolution) !');
          video.play().catch(function(err) {
            log('warn', 'Autoplay bloqué par le navigateur, cliquez sur lecture: ' + err.message);
          });
        });
        hls.on(Hls.Events.ERROR, function(e, data) {
          if (data.fatal) {
            log('error', 'Erreur HLS fatale: ' + data.type + ' (' + data.details + ')');
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              log('warn', 'Reconnexion réseau au flux...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }
        });
      } else if (video && video.canPlayType('application/vnd.apple.mpegurl')) {
        log('info', 'Lecture HLS native supportée...');
        video.src = streamUrl;
        video.play();
      }
    } else {
      var iframe = document.getElementById('sportsIframe');
      if (iframe) {
        iframe.onload = function() {
          log('success', 'Iframe chargée avec succès.');
        };
      }
    }
  </script>
</body>
</html>`);
});
