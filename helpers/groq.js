// ─── Groq API wrapper ─────────────────────────────────────────────────────────
// Responsible only for making HTTP calls to the Groq API.
// Returns the raw fetch Response so the caller can inspect status codes.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Call the Groq chat completions endpoint.
 * Automatically retries once on a 429 rate-limit, honouring the retry-after header.
 *
 * @param {object} payload  - The JSON body to send (messages, temperature, etc.)
 * @param {string} apiKey   - The Groq API key
 * @param {number} retries  - How many retries are left (default 1)
 * @returns {Promise<Response>}
 */
async function callGroq(payload, apiKey, retries = 1) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: GROQ_MODEL, ...payload })
    });

    // Rate-limited — wait then retry once
    if (response.status === 429 && retries > 0) {
        const wait = parseInt(response.headers.get('retry-after') || '2', 10) * 1000;
        console.warn(`⚠️  Rate limited. Retrying in ${wait / 1000}s…`);
        await new Promise(resolve => setTimeout(resolve, wait));
        return callGroq(payload, apiKey, retries - 1);
    }

    return response;
}

module.exports = { callGroq, GROQ_MODEL };
