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
import { getAuthToken } from './auth.js';

export async function fetchTodoList(notes, mode = 'default', customPrompt = '', userId = null) {
    if (!notes || !notes.trim()) {
        throw new Error('Please add some notes first.');
    }
    if (notes.length > MAX_CHARS) {
        throw new Error(
            `Notes are too long. Keep them under ${MAX_CHARS.toLocaleString()} characters.`
        );
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('https://note-to-action-agent-backend.onrender.com/process', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ notes, mode, customPrompt, userId }),
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
