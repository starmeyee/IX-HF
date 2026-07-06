/**
 * /src/ai/aiService.js
 * ─────────────────────
 * Client-side AI service for the Personalization Layer.
 *
 * All AI calls are proxied through /api/ai-personalize (server-side).
 * The API key NEVER touches the client.
 *
 * Features:
 *  - generatePersonalization(context) — calls server, parses response
 *  - getCachedPersonalization(userId)  — reads from sessionStorage
 *  - setCachedPersonalization(userId, data, ttlMinutes) — saves with expiry
 *  - isPersonalizationFresh(userId)    — returns true if cache not expired
 *  - Retry: 1 automatic retry on network failure (1s delay)
 *  - Graceful degradation: returns null on total failure (no error thrown)
 */

import { PROMPT_VERSION } from './prompts/personalization.js';

// ── Cache configuration ────────────────────────────────────────────────────────
const CACHE_KEY_PREFIX = 'ai_personal_';
const DEFAULT_TTL_MINUTES = 30;

/**
 * Generates a session-storage cache key for a given userId (rollNo).
 * Includes the prompt version so stale cache is auto-invalidated on prompt changes.
 */
function cacheKey(userId) {
  return `${CACHE_KEY_PREFIX}${userId}_${PROMPT_VERSION}`;
}

// ── Cache API ──────────────────────────────────────────────────────────────────

/**
 * Reads cached personalization data from sessionStorage.
 * Returns null if missing or expired.
 *
 * @param {string} userId - Typically the student's rollNo
 * @returns {Object|null} The cached AI data payload, or null
 */
export function getCachedPersonalization(userId) {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.expiresAt) return null;
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(cacheKey(userId));
      return null;
    }
    return entry.data ?? null;
  } catch {
    // sessionStorage unavailable or corrupted
    return null;
  }
}

/**
 * Saves personalization data to sessionStorage with a TTL.
 *
 * @param {string} userId - Typically the student's rollNo
 * @param {Object} data   - The AI response data to cache
 * @param {number} ttlMinutes - Cache lifetime in minutes (default: 30)
 */
export function setCachedPersonalization(userId, data, ttlMinutes = DEFAULT_TTL_MINUTES) {
  try {
    const entry = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      promptVersion: PROMPT_VERSION,
    };
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(entry));
  } catch {
    // Ignore quota errors or unavailability
  }
}

/**
 * Returns true if a fresh (non-expired) cache entry exists for the given userId.
 *
 * @param {string} userId
 * @returns {boolean}
 */
export function isPersonalizationFresh(userId) {
  return getCachedPersonalization(userId) !== null;
}

// ── Core fetch with retry ──────────────────────────────────────────────────────

/**
 * Internal helper — calls /api/ai-personalize once.
 * Throws on network error or non-2xx response.
 */
async function fetchPersonalization(context) {
  const response = await fetch('/api/ai-personalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI API ${response.status}: ${text.slice(0, 120)}`);
  }

  const json = await response.json();
  if (!json.ok || !json.data) {
    throw new Error('AI response missing data field');
  }
  return json.data;
}

/**
 * Calls /api/ai-personalize with the given anonymized context.
 * Implements 1 retry on network failure (1-second delay).
 * Returns null on total failure (graceful degradation — never throws).
 *
 * @param {Object} context - Anonymized context from buildUserContext()
 * @returns {Promise<Object|null>} Parsed AI personalization payload, or null
 */
export async function generatePersonalization(context) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        // Wait 1 second before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('[aiService] Retrying personalization request (attempt 2)...');
      }
      const data = await fetchPersonalization(context);
      return data;
    } catch (err) {
      const isLast = attempt === 1;
      if (isLast) {
        // Log final failure, but never propagate — graceful degradation
        console.warn('[aiService] Personalization failed after 2 attempts:', err.message);
        return null;
      }
      // For rate limit (429) don't retry
      if (err.message.includes('429')) {
        console.warn('[aiService] Rate-limited by AI server, skipping retry');
        return null;
      }
      console.warn('[aiService] Attempt 1 failed, will retry:', err.message);
    }
  }
  return null;
}
