import crypto from 'crypto';

export interface SportsApiKey {
  key: string;
  label: string;
  username: string;
  createdAt: string;
  lastUsedAt?: string | null;
  requestsCount: number;
  rateLimitPerMinute: number;
  tier: 'free' | 'pro' | 'unlimited';
  active: boolean;
}

// In-memory API keys storage with persistent defaults
const sportsKeys: Map<string, SportsApiKey> = new Map();

// Seed initial default keys
const defaultKeys: SportsApiKey[] = [
  {
    key: 'jmh_sport_master_live_8f3c1a9',
    label: 'Clé Master Sports Pro (Accès Illimité)',
    username: 'admin_master',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestsCount: 0,
    rateLimitPerMinute: 500,
    tier: 'unlimited',
    active: true,
  },
  {
    key: 'jmh_sport_demo_live_7e2b0d4',
    label: 'Clé Démo Publique (Tournois & Scores)',
    username: 'invite_sport',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestsCount: 0,
    rateLimitPerMinute: 120,
    tier: 'free',
    active: true,
  },
];

defaultKeys.forEach((k) => sportsKeys.set(k.key, k));

// Generate a new secure API Key
export function generateSportsApiKey(label: string, username: string, tier: 'free' | 'pro' | 'unlimited' = 'pro'): SportsApiKey {
  const randomHex = crypto.randomBytes(12).toString('hex');
  const key = `jmh_sport_${tier}_${randomHex}`;

  const newKeyItem: SportsApiKey = {
    key,
    label: label.trim() || 'Mon Application Sport Live',
    username: username.trim() || `user_${randomHex.substring(0, 6)}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    requestsCount: 0,
    rateLimitPerMinute: tier === 'unlimited' ? 500 : tier === 'pro' ? 240 : 60,
    tier,
    active: true,
  };

  sportsKeys.set(key, newKeyItem);
  return newKeyItem;
}

// Get all keys
export function getAllSportsKeys(): SportsApiKey[] {
  return Array.from(sportsKeys.values());
}

// Validate and track usage of an API key
export function validateAndTrackKey(providedKey: string): { valid: boolean; keyItem?: SportsApiKey; error?: string } {
  if (!providedKey) {
    return { valid: false, error: 'Clé API manquante. Fournissez votre clé via l’en-tête "x-api-key" ou le paramètre d’URL "?apiKey=..."' };
  }

  const keyItem = sportsKeys.get(providedKey.trim());
  if (!keyItem) {
    return { valid: false, error: 'Clé API invalide ou inexistante. Générez une clé valide depuis la section Générateur de Clés.' };
  }

  if (!keyItem.active) {
    return { valid: false, error: 'Cette clé API a été révoquée ou désactivée.' };
  }

  // Increment usage count and update lastUsedAt
  keyItem.requestsCount += 1;
  keyItem.lastUsedAt = new Date().toISOString();

  return { valid: true, keyItem };
}

// Revoke a key
export function revokeSportsKey(key: string): boolean {
  const keyItem = sportsKeys.get(key);
  if (!keyItem) return false;
  keyItem.active = false;
  return true;
}
