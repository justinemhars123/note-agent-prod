// ─── draft.js — Auto-save textarea draft ─────────────────────────────────────
// Saves the textarea content to localStorage every 2 seconds.
// On page load, restores the draft and shows a banner.
// No fetch(), no DOM rendering, no app logic.

const DRAFT_KEY = 'noteagent_draft';
let saveTimer = null;

/**
 * Start auto-saving the textarea every 2 seconds.
 * Call this once after the textarea is ready.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {function} onCounterUpdate  - called after restoring so counter re-syncs
 */
export function initDraft(textarea, onCounterUpdate) {
    // Auto-save on input
    textarea.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveDraft(textarea.value), 2000);
    });

    // Restore on load
    restoreDraft(textarea, onCounterUpdate);
}

export function saveDraft(text) {
    if (text && text.trim()) {
        localStorage.setItem(DRAFT_KEY, text);
    } else {
        localStorage.removeItem(DRAFT_KEY);
    }
}

export function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    clearTimeout(saveTimer);
}

function restoreDraft(textarea, onCounterUpdate) {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved || !saved.trim()) {
        return;
    }

    textarea.value = saved;
    if (onCounterUpdate) {
        onCounterUpdate();
    }
    showDraftBanner();
}

function showDraftBanner() {
    const banner = document.createElement('div');
    banner.className = 'draft-banner';
    banner.innerHTML = `
        <span>📝 Draft restored from your last session.</span>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    // Insert before the textarea's parent card
    const card = document.querySelector('.card');
    if (card) {
        card.prepend(banner);
    }
    setTimeout(() => banner.remove(), 6000);
}
