// ─── api.js — Server communication ───────────────────────────────────────────
// Responsible only for talking to the Express backend.
// All fetch() calls live here. Nothing else.

const MAX_CHARS = 2000;

/**
 * Send notes to the /process endpoint and return { result, provider, mode }.
 * Throws a user-friendly Error on any failure.
 *
 * @param {string} notes
 * @param {string} mode          - 'default' | 'simple' | 'meeting' | 'email'
 * @param {string} customPrompt  - optional override system prompt
 * @returns {Promise<{ result: string, provider: string, mode: string }>}
 */
export async function fetchTodoList(notes, mode = 'default', customPrompt = '') {
    if (!notes || !notes.trim()) {
        throw new Error('Please add some notes first.');
    }
    if (notes.length > MAX_CHARS) {
        throw new Error(`Notes are too long. Keep them under ${MAX_CHARS.toLocaleString()} characters.`);
    }

    const response = await fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, mode, customPrompt })
    });

    if (response.status === 429) {
        throw new Error('⏱️ Too many requests — wait a moment and try again.');
    }

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || 'Server error. Please try again.');
    }

    return { result: data.result, provider: data.provider, mode: data.mode };
}
