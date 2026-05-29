// ─── sanitize.js — Input and output sanitization ────────────────────────────
// Prevents XSS attacks by sanitizing user input and AI output before rendering.

/**
 * Sanitize a string to prevent XSS attacks.
 * Removes any script tags, event handlers, and dangerous content.
 *
 * @param {string} str - Input string
 * @returns {string} - Sanitized string safe for textContent
 */
export function sanitizeText(str) {
    if (typeof str !== 'string') return '';

    // Remove any HTML-like tags (defensive measure)
    let sanitized = str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<embed[^>]*>/gi, '')
        .replace(/<object[^>]*>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers

    return sanitized;
}

/**
 * Sanitize user input before sending to API.
 * Validates length and removes potentially dangerous characters.
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
            error: `Input exceeds ${maxLength} character limit`
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
    if (typeof output !== 'string') return '';
    return sanitizeText(output);
}

/**
 * Escape HTML special characters for safe display.
 * Useful for displaying user-generated content that might contain HTML chars.
 *
 * @param {string} str - String with potentially dangerous HTML chars
 * @returns {string} - HTML-escaped string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';

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
    if (typeof str !== 'string') return false;

    const dangerousPatterns = [
        /<script/i,
        /<iframe/i,
        /<embed/i,
        /<object/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<img[^>]*on/i,
        /<svg[^>]*on/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(str));
}

export default {
    sanitizeText,
    sanitizeUserInput,
    sanitizeAIOutput,
    escapeHtml,
    isSuspicious
};
