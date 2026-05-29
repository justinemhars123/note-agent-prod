// ─── share.js — Share result as URL ──────────────────────────────────────────
// Encodes the current result text into the URL hash so anyone with the link
// sees the same rendered list — no backend needed.
// No fetch(), no localStorage.

const SHARE_PREFIX = '#share=';

/**
 * Encode the result text into the page URL hash and copy the link.
 *
 * @param {string}   text       - The plain-text to-do list
 * @param {function} onDone     - Called with ('copied' | 'fallback') when done
 */
export function shareAsLink(text, onDone) {
    try {
        const encoded = btoa(encodeURIComponent(text));
        const url     = `${location.origin}${location.pathname}${SHARE_PREFIX}${encoded}`;

        navigator.clipboard.writeText(url)
            .then(()  => onDone('copied'))
            .catch(()  => onDone('fallback', url));

        // Update the address bar without a reload
        history.replaceState(null, '', `${SHARE_PREFIX}${encoded}`);

    } catch (e) {
        console.error('Share encoding error:', e);
        onDone('error');
    }
}

/**
 * Check if the current URL contains a shared result.
 * Returns the decoded text, or null if no share data is present.
 *
 * @returns {string|null}
 */
export function getSharedResult() {
    const hash = location.hash;
    if (!hash.startsWith(SHARE_PREFIX)) return null;

    try {
        return decodeURIComponent(atob(hash.slice(SHARE_PREFIX.length)));
    } catch {
        return null;
    }
}

/**
 * Clear the share hash from the URL without reloading.
 */
export function clearShareHash() {
    history.replaceState(null, '', location.pathname);
}
