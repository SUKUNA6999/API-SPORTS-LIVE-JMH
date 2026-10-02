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
// STREAM MEDIA PROXY HANDLER (BYPASS CORS & REFERRER RESTRICTIONS)
// -------------------------------------------------------------
sportsRouter.get('/stream/proxy', async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url || '');
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('URL invalide (doit commencer par http/https)');
  }

  try {
    const upstreamUrl = new URL(targetUrl);
    const origin = upstreamUrl.origin;

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${origin}/`,
        'Origin': origin,
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Erreur serveur amont: ${upstreamRes.statusText}`);
    }

    const rawContentType = upstreamRes.headers.get('content-type') || '';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const isPlaylist = targetUrl.includes('.m3u8') || rawContentType.includes('mpegurl') || rawContentType.includes('application/x-mpegurl');

    if (isPlaylist) {
      const text = await upstreamRes.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      // Rewrite each segment and sub-playlist to route through this proxy
      const modifiedLines = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
              const fullUri = uri.startsWith('http') ? uri : new URL(uri, baseUrl).toString();
              return `URI="/api/sports/stream/proxy?url=${encodeURIComponent(fullUri)}"`;
            });
          }
          return line;
        }

        const fullUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
        return `/api/sports/stream/proxy?url=${encodeURIComponent(fullUrl)}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(modifiedLines.join('\n'));
    }

    // Binary media segment (.ts or media chunks)
    res.setHeader('Content-Type', rawContentType || 'video/mp2t');
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(502).send(`Échec proxy flux: ${err.message}`);
    }
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
  const rawEmbedSrc = selectedStream?.embedUrl || selectedStream?.url || 'https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8';
  const isHls = rawEmbedSrc.includes('.m3u8') || selectedStream?.type === 'hls';
  const embedSrc = isHls && rawEmbedSrc.startsWith('http') && !rawEmbedSrc.includes('/api/sports/stream/proxy')
    ? `/api/sports/stream/proxy?url=${encodeURIComponent(rawEmbedSrc)}`
    : rawEmbedSrc;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'ALLOWALL');

  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
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
    .mirrors-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
    .mirror-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.2s; white-space: nowrap; }
    .mirror-btn:hover { background: #334155; color: #fff; }
    .mirror-btn.active { background: #10b981; color: #022c22; font-weight: 900; border-color: #34d399; }
    .player-wrap { position: relative; flex: 1; width: 100%; height: calc(100% - 56px); background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    iframe { width: 100%; height: 100%; border: none; background: #000; }
    .unmute-btn { position: absolute; top: 16px; left: 16px; background: #f59e0b; color: #000; font-weight: 900; font-size: 12px; padding: 8px 16px; border-radius: 12px; border: none; cursor: pointer; z-index: 99; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(245,158,11,0.4); }
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
      <button id="unmuteBtn" class="unmute-btn" onclick="toggleSound()">
        🔊 Activer le Son
      </button>
    ` : `
      <iframe
        id="sportsIframe"
        src="${embedSrc}"
        referrerpolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowfullscreen
      ></iframe>
    `}
  </div>

  <script>
    var isHls = ${JSON.stringify(isHls)};
    var streamUrl = ${JSON.stringify(embedSrc)};
    var video = document.getElementById('sportsVideo');
    var unmuteBtn = document.getElementById('unmuteBtn');

    function toggleSound() {
      if (video) {
        video.muted = false;
        video.volume = 0.85;
        if (unmuteBtn) unmuteBtn.style.display = 'none';
      }
    }

    if (isHls && video) {
      if (Hls.isSupported()) {
        var hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          liveSyncDurationCount: 3,
          maxBufferLength: 60,
          maxMaxBufferLength: 120
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          video.play().catch(function() {});
        });
        hls.on(Hls.Events.ERROR, function(e, data) {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch(function() {});
      }

      video.addEventListener('volumechange', function() {
        if (!video.muted && video.volume > 0 && unmuteBtn) {
          unmuteBtn.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`);
});
