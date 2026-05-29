// ─── sanitize.js — Input and output sanitization ─────────────────────────────
// Uses DOMPurify — the industry-standard XSS sanitizer.
// Replaces previous regex-based approach which was bypassable.

import DOMPurify from './vendor/purify.es.mjs';

/**
 * Sanitize a string to prevent XSS attacks.
 * Strips ALL HTML tags and attributes — returns plain text only.
 *
 * @param {string} str - Input string
 * @returns {string} - Sanitized plain-text string
 */
export function sanitizeText(str) {
    if (typeof str !== 'string') {
        return '';
    }
    // ALLOWED_TAGS: [] means strip every HTML tag, leaving only text nodes
    return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize user input before sending to API.
 * Validates length and sanitizes content.
 *
 * @param {string} input - User input
 * @param {number} maxLength - Maximum allowed length
 * @returns {object} - { valid: boolean, sanitized: string, error: string|null }
 */
export function sanitizeUserInput(input, maxLength = 2000) {
    if (typeof input !== 'string') {
        return { valid: false, sanitized: '', error: 'Input must be a string' };
    }

    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return { valid: false, sanitized: '', error: 'Input cannot be empty' };
    }

    if (trimmed.length > maxLength) {
        return {
            valid: false,
            sanitized: '',
            error: `Input exceeds ${maxLength} character limit`,
        };
    }

    const sanitized = sanitizeText(trimmed);

    return { valid: true, sanitized, error: null };
}

/**
 * Sanitize AI output before rendering.
 * Ensures the output is safe to display in the UI.
 *
 * @param {string} output - AI response text
 * @returns {string} - Sanitized output
 */
export function sanitizeAIOutput(output) {
    if (typeof output !== 'string') {
        return '';
    }
    return sanitizeText(output);
}

/**
 * Escape HTML special characters for safe insertion into HTML contexts.
 *
 * @param {string} str - String with potentially dangerous HTML chars
 * @returns {string} - HTML-escaped string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate if a string looks like it could contain malicious code.
 * Returns true if dangerous patterns are detected.
 *
 * @param {string} str - String to check
 * @returns {boolean} - True if potentially dangerous
 */
export function isSuspicious(str) {
    if (typeof str !== 'string') {
        return false;
    }
    // Run through DOMPurify — if output differs from input, it was dirty
    const cleaned = DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    return cleaned !== str;
}

export default {
    sanitizeText,
    sanitizeUserInput,
    sanitizeAIOutput,
    escapeHtml,
    isSuspicious,
};
