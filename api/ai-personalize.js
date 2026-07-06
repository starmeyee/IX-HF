/**
 * /api/ai-personalize.js
 * ──────────────────────
 * POST endpoint for AI personalization.
 * Accepts anonymized student context JSON, calls NVIDIA (DeepSeek v4 Pro)
 * via raw fetch (OpenAI-compatible), and returns a structured JSON payload.
 *
 * Security:
 *  - API key lives in Vercel env (NVIDIA_API_KEY) — never exposed to client
 *  - Context is anonymized before being sent (no phone, no password)
 *  - Simple in-memory rate-limit: 1 request per user per 5 minutes
 *
 * Rate limiting resets on every cold start (serverless-appropriate).
 */

// ─── System Prompt (inlined so this serverless file is self-contained) ────────
const SYSTEM_PROMPT = `You are an AI academic assistant for a 10th-grade student portal called "10th HI".
Your ONLY job is to analyze the student's data provided in the user message and return a single JSON object.

STRICT RULES:
1. Return ONLY valid JSON. No markdown fences, no explanations, no text before or after.
2. Never act like a chatbot. Never say "Hello" or "Here is your response".
3. Never hallucinate data — only use what is provided in the context.
4. If a data field is missing or null, skip that insight entirely.
5. No emojis in descriptions. Emojis in titles are allowed only if they feel natural.
6. Be specific and personal, not generic. Reference the actual numbers and subjects from context.
7. Return exactly 1 card containing the most important insight or reminder for the student right now.

Return exactly this JSON shape:
{
  "cards": [
    {
      "type": "reminder|achievement|tip|insight|alert",
      "priority": "high|medium|low",
      "title": "string",
      "description": "string (specific, not generic. do not greet the user here)"
    }
  ],
  "motivation": "string (short, genuine motivational quote or personalized encouragement — no emojis)"
}

Card type guidelines:
- "reminder": upcoming deadlines, pending homework, tasks not completed
- "achievement": milestones hit, good attendance, completed assignments
- "tip": study strategies based on their actual data patterns
- "insight": data observations (attendance trends, syllabus coverage stats)
- "alert": attendance below 75%, overdue homework, critical warnings

Focus on the most urgent or impactful piece of data (e.g. poor attendance, incomplete homework, or a big achievement).
Be encouraging but truthful. Never inflate numbers.`;

// ─── In-Memory Rate Limit Store ───────────────────────────────────────────────
// Resets on cold start. Key = hashed phone identifier, value = last request timestamp.
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 30 * 1000; // 30 seconds (reduced to avoid lockout during testing)

/**
 * Simple djb2-style hash for a string — produces a deterministic numeric string.
 * Not cryptographic, just for rate-limit keying with no PII stored.
 */
function hashIdentifier(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(36);
}

// ─── Validate AI Response Shape ───────────────────────────────────────────────
function isValidAIResponse(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!Array.isArray(obj.cards)) return false;
  if (typeof obj.motivation !== 'string') return false;
  return true;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // ── CORS headers ────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Parse & validate body ────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { context } = body || {};

  if (!context || typeof context !== 'object' || Object.keys(context).length === 0) {
    return res.status(400).json({ error: 'context is required and must be a non-empty object' });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  // Use roll number + date as the identifier (anonymized, no phone)
  const identifier = [
    context?.profile?.rollNo || 'unknown',
    context?.temporal?.date || 'nodate',
  ].join('|');
  const rateLimitKey = hashIdentifier(identifier);
  const now = Date.now();
  const lastRequest = rateLimitMap.get(rateLimitKey);

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    console.log(`[ai-personalize] rate-limited key=${rateLimitKey} retryAfter=${retryAfterSec}s`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: retryAfterSec,
    });
  }

  rateLimitMap.set(rateLimitKey, now);

  // ── Check API key ─────────────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY; // fallback if they haven't changed the env name yet
  if (!apiKey) {
    console.error('[ai-personalize] GROQ_API_KEY env variable is not set');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // ── Call Groq API ────────────────────────────────────────────────
  const contextStr = JSON.stringify(context, null, 2);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Here is the student's current data. Analyze it and return the personalization JSON:\n\n${contextStr}`,
    },
  ];

  console.log(`[ai-personalize] Calling Groq for rollNo=${context?.profile?.rollNo || 'unknown'}`);

  // 30-second timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let aiResponseText;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[ai-personalize] Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      return res.status(502).json({ error: 'AI provider error', status: response.status });
    }

    const data = await response.json();
    aiResponseText = data?.choices?.[0]?.message?.content;

    if (!aiResponseText) {
      console.error('[ai-personalize] Empty content in AI response', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'Empty response from AI provider' });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[ai-personalize] Request timed out after 30s');
      return res.status(504).json({ error: 'AI request timed out' });
    }
    console.error('[ai-personalize] Fetch error:', err.message);
    return res.status(502).json({ error: 'Failed to reach AI provider' });
  }

  // ── Parse & validate AI JSON output ──────────────────────────────────────────
  let parsed;
  try {
    // Strip markdown fences if the model accidentally adds them
    let clean = aiResponseText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    // Also handle <think> tags from reasoning models
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // If there's JSON embedded in other text, extract the first { } block
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) clean = jsonMatch[0];
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('[ai-personalize] Failed to parse AI JSON:', err.message);
    console.error('[ai-personalize] Raw response (first 500 chars):', aiResponseText.slice(0, 500));
    return res.status(502).json({ error: 'AI returned malformed JSON' });
  }

  if (!isValidAIResponse(parsed)) {
    console.error('[ai-personalize] AI response failed shape validation');
    return res.status(502).json({ error: 'AI response shape invalid' });
  }

  // ── Enforce limits ────────────────────────────────────────────────────────────
  parsed.cards = (parsed.cards || []).slice(0, 1);

  // Sort cards: high → medium → low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  parsed.cards.sort(
    (a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
  );

  console.log(`[ai-personalize] Success: ${parsed.cards.length} cards for rollNo=${context?.profile?.rollNo || 'unknown'}`);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, data: parsed });
}
