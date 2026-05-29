// ─── helpers/openai.js — OpenAI fallback provider ────────────────────────────
// Only used if OPENAI_API_KEY is set in .env and Groq fails.
// Mirrors the same interface as helpers/groq.js.

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL   = 'gpt-4o-mini'; // cheap + fast fallback

/**
 * Call OpenAI chat completions.
 * @param {object} payload  - messages, temperature, max_tokens (no model key needed)
 * @param {string} apiKey
 * @returns {Promise<Response>}
 */
async function callOpenAI(payload, apiKey) {
    return fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: OPENAI_MODEL, ...payload })
    });
}

module.exports = { callOpenAI };
