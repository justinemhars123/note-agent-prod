// ─── app.js — Main entry point ────────────────────────────────────────────────
// Wires all modules together. No rendering, fetch, or storage logic lives here.

import { fetchTodoList } from './api.js';
import {
    saveToHistory,
    loadHistory,
    clearHistory,
    saveCompleted,
    loadCompleted,
    clearCompleted,
    getUserId,
} from './storage.js';
import {
    initAuth,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getSession,
    getAuthToken,
} from './auth.js';
import { mountGrainient } from './grainient.js';
import {
    renderTodoList,
    renderHistorySection,
    shakeElement,
    updateProgressBar,
    setTaskToggleHandler,
} from './render.js';
import { initDraft, clearDraft } from './draft.js';
import { toggleVoice, isVoiceSupported } from './voice.js';
import { shareAsLink, getSharedResult, clearShareHash } from './share.js';
import {
    initDueReminders,
    enableDueReminders,
    scheduleDueReminders,
    getReminderPermission,
} from './reminders.js';
import { displayError, clearError } from './errorHandler.js';
import { createCooldown } from './throttle.js';
import { createSmartRequester } from './dedup.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_CHARS = 2000;

const SAMPLE_NOTES = {
    1: `Meeting with the team today at 2pm, finish report by Friday, buy groceries, call the doctor to reschedule appointment`,
    2: `Pick up dry cleaning tomorrow morning, pay electricity bill before the 30th, call mum on Sunday, renew car insurance this week, tidy the garage whenever I get a chance`,
    3: `Sprint planning session at 9am today, deploy the auth fix to staging by Wednesday, write unit tests for the payment module before Friday's release, update README docs anytime, code review for Sarah's PR today`,
};

const TYPING_MESSAGES = [
    'AI is reading your notes…',
    'Extracting tasks…',
    'Identifying deadlines…',
    'Organising by priority…',
    'Almost done…',
];

// ─── State ────────────────────────────────────────────────────────────────────
let typingInterval = null;
let completedTasks = new Set();
let currentMode = 'default';
let currentResult = '';
let isHistoryClearMode = false; // Track if we're in history clear mode
const submitCooldown = createCooldown(1000); // Prevent spam: 1 request per second max
const requester = createSmartRequester(5 * 60 * 1000); // 5-minute cache for identical requests

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    completedTasks = loadCompleted();

    // Register task-toggle handler → persist completion state
    setTaskToggleHandler((taskText, isChecked) => {
        isChecked ? completedTasks.add(taskText) : completedTasks.delete(taskText);
        saveCompleted(completedTasks);
        updateProgressBar();
    });

    // Auto-save draft
    initDraft($('notes'), updateCounter);

    // Mount Grainient WebGL background
    const bgEl = document.getElementById('grainientBg');
    if (bgEl) {
        mountGrainient(bgEl, {
            color1: '#3d2b7a', // muted deep purple
            color2: '#05020f', // near-black
            color3: '#1a0e3d', // very dark navy
            timeSpeed: 0.12,
            warpStrength: 0.6,
            warpFrequency: 3.5,
            warpSpeed: 1.2,
            warpAmplitude: 80.0,
            rotationAmount: 300.0,
            noiseScale: 2.0,
            grainAmount: 0.04,
            contrast: 1.0,
            saturation: 0.85,
            zoom: 0.9,
        });
    }

    // Initialize Auth
    initAuth().then(() => {
        updateAuthUI(getSession());
    });

    window.addEventListener('auth-changed', (e) => {
        updateAuthUI(e.detail.session);
        if (e.detail.session) {
            refreshHistory(); // Refresh history when logged in
            $('authModal').classList.add('hidden');
        }
    });

    // User profile dropdown toggle
    const profileTrigger = $('profileTrigger');
    const profileDropdown = $('profileDropdown');

    profileTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown?.classList.toggle('active');
        $('userProfile')?.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userProfile')) {
            profileDropdown?.classList.remove('active');
            $('userProfile')?.classList.remove('active');
        }
    });

    // Dropdown Action Event Delegation
    profileDropdown?.addEventListener('click', async (e) => {
        const btnId = e.target.id;
        if (!btnId) {
            return;
        }

        profileDropdown.classList.remove('active');
        $('userProfile')?.classList.remove('active');

        if (btnId === 'historyBtn') {
            $('historySidebar').classList.remove('hidden');
            $('sidebarOverlay').classList.remove('hidden');
        } else if (btnId === 'signInBtn') {
            $('authModal').classList.remove('hidden');
        } else if (btnId === 'switchAccountBtn') {
            await signOut();
            $('authModal').classList.remove('hidden');
        } else if (btnId === 'signOutBtn') {
            await signOut();
            refreshHistory(); // refresh as anonymous user
        }
    });

    $('closeSidebarBtn')?.addEventListener('click', () => {
        $('historySidebar').classList.add('hidden');
        $('sidebarOverlay').classList.add('hidden');
    });

    $('sidebarOverlay')?.addEventListener('click', () => {
        $('historySidebar').classList.add('hidden');
        $('sidebarOverlay').classList.add('hidden');
        $('authModal').classList.add('hidden');
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            $('historySidebar')?.classList.add('hidden');
            $('sidebarOverlay')?.classList.add('hidden');
            $('authModal')?.classList.add('hidden');
        }
    });

    // Auth Modal DOM Events
    $('authBtn')?.addEventListener('click', () => $('authModal').classList.remove('hidden'));
    $('authCloseBtn')?.addEventListener('click', () => {
        $('authModal').classList.add('hidden');
        if ($('authError')) {
            $('authError').classList.add('hidden');
        }
    });

    $('googleSignInBtn')?.addEventListener('click', async () => {
        const btn = $('googleSignInBtn');
        btn.classList.add('loading');
        btn.textContent = 'Redirecting…';
        const { error } = await signInWithGoogle();
        if (error) {
            btn.classList.remove('loading');
            btn.innerHTML =
                '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Continue with Google';
            displayAuthError(error.message);
        }
        // On success the page redirects — no need to reset the button
    });

    $('emailAuthForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('signInEmailBtn');
        const email = $('authEmail').value;
        const password = $('authPassword').value;
        btn.classList.add('loading');
        const { error } = await signInWithEmail(email, password);
        btn.classList.remove('loading');
        if (error) {
            displayAuthError(error.message);
        }
    });

    $('signUpEmailBtn')?.addEventListener('click', async () => {
        if (!$('emailAuthForm').checkValidity()) {
            $('emailAuthForm').reportValidity();
            return;
        }
        const btn = $('signUpEmailBtn');
        const email = $('authEmail').value;
        const password = $('authPassword').value;
        btn.classList.add('loading');
        const { error } = await signUpWithEmail(email, password);
        btn.classList.remove('loading');
        if (error) {
            displayAuthError(error.message);
        } else {
            displayAuthError('Check your email for the confirmation link!', true);
        }
    });

    // Dark / light mode preference
    applyTheme(localStorage.getItem('noteagent_theme') || 'dark');

    // Keyboard shortcut label (Mac vs others)
    if (navigator.platform.toUpperCase().includes('MAC')) {
        const hint = $('shortcutHint');
        if (hint) {
            hint.textContent = '⌘ Enter';
        }
    }

    // Hide mic button if voice not supported
    if (!isVoiceSupported()) {
        const micBtn = $('micBtn');
        if (micBtn) {
            micBtn.style.display = 'none';
        }
    }

    updateCounter();
    refreshHistory();
    disablePWA();
    initDueReminders();
    updateReminderButton();

    // Restore shared result from URL hash
    const shared = getSharedResult();
    if (shared) {
        renderSharedResult(shared);
        clearShareHash();
    }

    // ─── Wire all button event listeners (replaces inline onclick attrs) ──────
    $('themeBtn')?.addEventListener('click', toggleTheme);
    $('clearBtn')?.addEventListener('click', clearAll);
    $('micBtn')?.addEventListener('click', toggleVoiceInput);
    $('submitBtn')?.addEventListener('click', processNotes);
    $('advancedToggle')?.addEventListener('click', toggleAdvanced);
    $('copyBtn')?.addEventListener('click', copyResult);
    $('exportBtn')?.addEventListener('click', exportResult);
    $('icsBtn')?.addEventListener('click', exportICS);
    $('reminderBtn')?.addEventListener('click', enableReminders);
    $('shareBtn')?.addEventListener('click', shareResult);
    $('sample1Btn')?.addEventListener('click', () => loadSample(1));
    $('sample2Btn')?.addEventListener('click', () => loadSample(2));
    $('sample3Btn')?.addEventListener('click', () => loadSample(3));

    // Textarea input counter (replaces oninput attribute)
    $('notes')?.addEventListener('input', updateCounter);

    // Mode selector buttons
    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
});

// ─── Keyboard shortcut: Ctrl/Cmd + Enter ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        processNotes();
    }
});

// ─── PWA service worker registration ─────────────────────────────────────────
function disablePWA() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .then(() => {
            if (!('caches' in window)) {
                return;
            }
            return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        })
        .then(() => console.log('PWA disabled and old caches cleared'))
        .catch((error) => console.warn('PWA cleanup failed:', error));
}

// ─── Dark / Light mode ────────────────────────────────────────────────────────
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = $('themeBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('noteagent_theme', next);
    applyTheme(next);
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
function updateAuthUI(session) {
    const authBtn = $('authBtn');
    const historyIcon = $('historyToggleBtn');
    const userProfile = $('userProfile');
    const userEmail = $('userEmail');
    const profileDropdown = $('profileDropdown');

    if (session && session.user) {
        // ── Logged in: hide Sign In button + 🕒 icon, show profile dropdown
        if (authBtn) {
            authBtn.style.display = 'none';
        }
        if (historyIcon) {
            historyIcon.style.display = 'none';
        }
        if (userProfile) {
            userProfile.classList.remove('hidden');
        }
        if (userEmail) {
            userEmail.textContent = session.user.email;
        }
        if (profileDropdown) {
            profileDropdown.innerHTML = `
                <button class="dropdown-item" id="historyBtn">History</button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" id="switchAccountBtn">Switch Account</button>
                <button class="dropdown-item dropdown-item--danger" id="signOutBtn">Sign Out</button>
            `;
        }
    } else {
        // ── Logged out: show Sign In button + 🕒 icon, hide profile dropdown
        if (authBtn) {
            authBtn.style.display = '';
        }
        if (historyIcon) {
            historyIcon.style.display = '';
        }
        if (userProfile) {
            userProfile.classList.add('hidden');
        }
        if (userEmail) {
            userEmail.textContent = '';
        }
    }
}

function displayAuthError(msg, isSuccess = false) {
    const errBox = $('authError');
    if (!errBox) {
        return;
    }
    errBox.textContent = msg;
    errBox.style.color = isSuccess ? '#2ecc71' : '#e74c3c';
    errBox.style.backgroundColor = isSuccess ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)';
    errBox.classList.remove('hidden');
}

// ─── Sample inputs ────────────────────────────────────────────────────────────
function loadSample(n) {
    const textarea = $('notes');
    textarea.value = SAMPLE_NOTES[n];
    textarea.focus();
    updateCounter();
    initDraft(textarea, updateCounter); // re-init to pick up new value
    textarea.style.borderColor = 'var(--clr-primary)';
    setTimeout(() => {
        textarea.style.borderColor = '';
    }, 600);
}

// ─── #5: Character counter ────────────────────────────────────────────────────
function updateCounter() {
    const textarea = $('notes');
    const counter = document.querySelector('.char-counter');
    const countEl = $('charCount');
    if (!textarea || !counter || !countEl) {
        return;
    }

    const len = textarea.value.length;
    countEl.textContent = len.toLocaleString();
    counter.classList.remove('warn', 'limit');
    if (len >= MAX_CHARS) {
        counter.classList.add('limit');
    } else if (len >= MAX_CHARS * 0.8) {
        counter.classList.add('warn');
    }
}

// ─── #7: Clear ───────────────────────────────────────────────────────────────
function clearAll() {
    $('notes').value = '';
    $('result').classList.add('hidden');
    $('errorBox').classList.add('hidden');
    $('progressSection').classList.add('hidden');
    $('todoList').innerHTML = '';
    completedTasks = new Set();
    clearCompleted();
    clearDraft();
    updateCounter();
    $('notes').focus();
}

// ─── #9: Voice input ─────────────────────────────────────────────────────────
function toggleVoiceInput() {
    const btn = $('micBtn');
    if (!isVoiceSupported()) {
        showToast('Voice input is not supported in your browser. Try Chrome or Edge.', 'error');
        return;
    }
    toggleVoice($('notes'), btn, updateCounter);
}

// ─── Output mode selector ────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach((b) => {
        b.classList.toggle('mode-active', b.dataset.mode === mode);
    });
}

// ─── #11: Typing animation ────────────────────────────────────────────────────
function startTypingAnimation() {
    $('typingIndicator').classList.remove('hidden');
    $('submitBtn').classList.add('hidden');
    let i = 0;
    const msgEl = $('typingMsg');
    msgEl.textContent = TYPING_MESSAGES[0];
    typingInterval = setInterval(() => {
        i = (i + 1) % TYPING_MESSAGES.length;
        msgEl.style.opacity = '0';
        setTimeout(() => {
            msgEl.textContent = TYPING_MESSAGES[i];
            msgEl.style.opacity = '1';
        }, 200);
    }, 2000);
}

function stopTypingAnimation() {
    clearInterval(typingInterval);
    $('typingIndicator').classList.add('hidden');
    $('submitBtn').classList.remove('hidden');
}

// ─── Custom prompt panel ──────────────────────────────────────────────────────
function toggleAdvanced() {
    const panel = $('advancedPanel');
    const btn = $('advancedToggle');
    const open = panel.classList.toggle('hidden');
    btn.textContent = open ? '⚙️ Advanced' : '⚙️ Advanced ▲';
}

// ─── Main: processNotes ───────────────────────────────────────────────────────
async function processNotes() {
    const notes = $('notes').value.trim();
    const customPrompt = $('customPromptInput')?.value.trim() || '';

    if (!notes) {
        shakeElement($('notes'));
        return;
    }

    // Rate limiting: prevent spam submissions
    if (!submitCooldown.check()) {
        const remainingMs = submitCooldown.getRemainingMs();
        const remainingSecs = Math.ceil(remainingMs / 1000);
        shakeElement($('submitBtn'));
        displayError($('errorBox'), `Please wait ${remainingSecs}s before submitting again`);
        return;
    }

    startTypingAnimation();
    $('result').classList.add('hidden');
    $('progressSection').classList.add('hidden');
    $('todoList').innerHTML = '';

    try {
        clearError($('errorBox'));

        // Create a unique key for deduplication/caching
        // Same notes + mode + custom prompt = same request
        const requestKey = JSON.stringify({ notes, currentMode, customPrompt });

        // Use smart requester to deduplicate and cache
        const { result, mode } = await requester.execute(requestKey, () =>
            fetchTodoList(notes, currentMode, customPrompt, getUserId())
        );
        currentResult = result;

        completedTasks = new Set(); // fresh list → reset completion
        clearCompleted();

        renderTodoList(result, $('todoList'), completedTasks, mode || currentMode);
        updateProgressBar();
        const scheduledCount = scheduleDueReminders(result);
        if (scheduledCount > 0) {
            flashBtn($('reminderBtn'), 'Reminder set', 'Remind');
        }
        updateReminderButton();

        $('result').classList.remove('hidden');
        $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        saveToHistory(result, currentMode);
        refreshHistory();
    } catch (err) {
        // Show enhanced error with recovery options
        displayError($('errorBox'), err, () => {
            // Retry handler — reset cooldown for user retry
            submitCooldown.reset();
            window.processNotes();
        });
    } finally {
        stopTypingAnimation();
    }
}

// ─── #6: Copy ────────────────────────────────────────────────────────────────
async function copyResult() {
    const copyBtn = $('copyBtn');
    const text = $('todoList').innerText || $('todoList').textContent;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = '✅ Copied!';
    } catch {
        copyBtn.innerHTML = '❌ Failed';
    }
    setTimeout(() => {
        copyBtn.innerHTML = '📋 Copy';
    }, 2000);
}

// ─── #9: Export .md ──────────────────────────────────────────────────────────
function exportResult() {
    const text = ($('todoList').innerText || $('todoList').textContent).trim();
    if (!text) {
        return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const content = `# My To-Do List\n*Generated by NoteAgent on ${date}*\n\n${text}`;
    downloadFile(`todo-${date}.md`, content, 'text/markdown');
    flashBtn($('exportBtn'), '✅ Saved!', '⬇️ Export');
}

// ─── Export .ics (calendar) ──────────────────────────────────────────────────
function exportICS() {
    if (!currentResult) {
        return;
    }
    const lines = currentResult
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    const events = [];
    const today = new Date();

    lines.forEach((line) => {
        if (!line.startsWith('-')) {
            return;
        }
        const clean = line.replace(/^[-•]\s*/, '').replace(/^\[\d+\]\s*/, '');
        // Handle both '→ Due: Friday' and '→ Friday'
        const dueSplit = clean.split(/→\s*(?:Due:\s*)?/i);
        const title = dueSplit[0].trim();
        const dueStr = dueSplit[1]?.trim();

        if (!dueStr) {
            return;
        } // skip tasks with no due date

        const dueDate = parseDueDate(dueStr, today);
        if (!dueDate) {
            return;
        }

        const stamp = formatICSDate(dueDate);
        const uid = `noteagent-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        events.push(
            [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${formatICSDate(today)}`,
                `DTSTART;VALUE=DATE:${stamp.slice(0, 8)}`,
                `DTEND;VALUE=DATE:${stamp.slice(0, 8)}`,
                `SUMMARY:${title}`,
                'END:VEVENT',
            ].join('\r\n')
        );
    });

    if (events.length === 0) {
        showToast('No tasks with due dates found to export.', 'info');
        return;
    }

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NoteAgent//EN',
        'CALSCALE:GREGORIAN',
        ...events,
        'END:VCALENDAR',
    ].join('\r\n');

    downloadFile(`noteagent-${new Date().toISOString().slice(0, 10)}.ics`, ics, 'text/calendar');
    flashBtn($('icsBtn'), '✅ Saved!', '📅 .ics');
}

// ─── #8: Share as link ───────────────────────────────────────────────────────
function shareResult() {
    const btn = $('shareBtn');
    shareAsLink(currentResult, (status, url) => {
        if (status === 'copied') {
            flashBtn(btn, '✅ Link copied!', '🔗 Share');
        } else if (status === 'fallback') {
            prompt('Copy this link:', url);
        }
    });
}

// ─── #8: Restore shared result ────────────────────────────────────────────────
function renderSharedResult(text) {
    currentResult = text;
    renderTodoList(text, $('todoList'), new Set(), 'default');
    updateProgressBar();
    scheduleDueReminders(text);
    updateReminderButton();
    $('result').classList.remove('hidden');

    const banner = document.createElement('div');
    banner.className = 'draft-banner';
    banner.innerHTML = `<span>🔗 Viewing a shared result.</span><button onclick="this.parentElement.remove()">✕</button>`;
    document.querySelector('.card').prepend(banner);
}

// ─── #8: History ─────────────────────────────────────────────────────────────
async function refreshHistory() {
    let history;
    try {
        const userId = getUserId();
        const headers = {};
        const token = getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const list = $('historyList');
        if (list) {
            list.innerHTML = `<div class="sidebar-loader"><div class="spinner"></div><span>Loading history...</span></div>`;
        }
const res = await fetch(`https://note-to-action-agent-backend.onrender.com/history?userId=${userId}&_=${Date.now()}`, { headers });        const data = await res.json();
        if (res.ok && data.notes) {
            history = data.notes.map((n) => ({
                id: n.id,
                text: n.ai_result,
                mode: n.mode,
                date: new Date(n.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }),
            }));
        } else {
            history = loadHistory();
        }
    } catch (err) {
        console.warn('Failed to fetch Supabase history, falling back to local', err);
        history = loadHistory();
    }

    renderHistorySection(
        history,
        (text, mode) => {
            currentResult = text;
            currentMode = mode || 'default';
            completedTasks = loadCompleted();
            renderTodoList(text, $('todoList'), completedTasks, currentMode);
            updateProgressBar();
            scheduleDueReminders(text);
            updateReminderButton();
            $('result').classList.remove('hidden');
            $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Auto-close sidebar
            $('historySidebar')?.classList.add('hidden');
            $('sidebarOverlay')?.classList.add('hidden');
        },
        async (selectedIds) => {
            if (selectedIds === null) {
                // Toggle clear mode
                isHistoryClearMode = !isHistoryClearMode;
                refreshHistory();
            } else if (selectedIds && selectedIds.length > 0) {
                // Delete selected items
                await deleteSelectedHistoryItems(selectedIds);
                isHistoryClearMode = false;
                refreshHistory();
            }
        },
        isHistoryClearMode
    );
}

// ─── Delete selected history items ────────────────────────────────────────────
async function deleteSelectedHistoryItems(noteIds) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('No auth token available for deletion');
    }

    let deletedCount = 0;
    try {
        for (const noteId of noteIds) {
            console.log(`Deleting note: ${noteId}`);
            const res = await fetch(
                `https://note-to-action-agent-backend.onrender.com/history/${noteId}`,
                { 
                    method: 'DELETE', 
                    headers,
                }
            );
            if (res.ok) {
                deletedCount++;
                console.log(`✓ Deleted note: ${noteId}`);
            } else {
                console.error(`Failed to delete note ${noteId}:`, res.status, res.statusText);
            }
        }
        if (deletedCount > 0) {
            showToast(`Deleted ${deletedCount} item(s)`, 'success');
        }
    } catch (err) {
        console.error('Error deleting history items:', err);
        displayError($('errorBox'), 'Failed to delete selected items. Check your connection and try again.');
    }
}

// Browser due-date reminders
async function enableReminders() {
    if (!currentResult) {
        return;
    }

    const btn = $('reminderBtn');
    const { status, count } = await enableDueReminders(currentResult);

    if (status === 'scheduled') {
        flashBtn(btn, count > 0 ? `${count} set` : 'Already set', 'Remind');
    } else if (status === 'denied') {
        showToast('Notifications are blocked. Enable them in your browser settings.', 'error');
    } else if (status === 'unsupported') {
        showToast('This browser does not support notifications.', 'error');
    }

    updateReminderButton();
}

function updateReminderButton() {
    const btn = $('reminderBtn');
    if (!btn) {
        return;
    }

    const permission = getReminderPermission();
    btn.disabled = permission === 'unsupported';
    btn.title =
        permission === 'granted'
            ? 'Schedule browser reminders for due dates'
            : 'Enable browser notifications for due-date reminders';
}

// ─── ICS helpers ──────────────────────────────────────────────────────────────
function parseDueDate(str, today) {
    const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };

    // Normalize: strip leading "by " or "on " (AI sometimes outputs these)
    const lower = str
        .toLowerCase()
        .trim()
        .replace(/^(by|on)\s+/, '');

    if (lower === 'today') {
        return new Date(today);
    }
    if (lower === 'tomorrow') {
        return new Date(today.getTime() + 86_400_000);
    }

    // Full or partial day name match (e.g. "friday", "this friday")
    const dayMatch = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (dayMatch) {
        const target = dayMap[dayMatch[1]];
        const base = new Date(today);
        base.setHours(0, 0, 0, 0);
        const diff = (target - base.getDay() + 7) % 7;
        return new Date(base.getTime() + (diff || 7) * 86_400_000);
    }

    // Try native date parsing as last resort (e.g. "May 2", "2026-05-01")
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function formatICSDate(d) {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// ─── Toast notifications (replaces all alert() calls) ────────────────────────
function showToast(message, type = 'info', durationMs = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, durationMs);
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delay revoke so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function flashBtn(btn, tempText, original) {
    if (!btn) {
        return;
    }
    btn.textContent = tempText;
    setTimeout(() => {
        btn.textContent = original;
    }, 2000);
}
