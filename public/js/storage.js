// ─── storage.js — All localStorage operations ─────────────────────────────────
// No fetch(). No DOM. Pure data layer.

const HISTORY_KEY    = 'noteagent_history';
const COMPLETED_KEY  = 'noteagent_completed';
const MAX_HISTORY    = 3;

// ─── History ──────────────────────────────────────────────────────────────────
export function saveToHistory(resultText, mode = 'default') {
    const history = loadHistory();
    history.unshift({
        text: resultText,
        mode,
        date: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    });
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
}

// ─── Task completion state ────────────────────────────────────────────────────
export function saveCompleted(taskSet) {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...taskSet]));
}

export function loadCompleted() {
    try {
        const raw = localStorage.getItem(COMPLETED_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

export function clearCompleted() {
    localStorage.removeItem(COMPLETED_KEY);
}
