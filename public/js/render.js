// ─── render.js — DOM rendering ────────────────────────────────────────────────
// Responsible only for turning data into DOM elements.
// No fetch(). No localStorage. Pure UI rendering.

import { wrapDayRefs, attachCalendarToBadge } from './calendar.js';
import { enableDragSort }                      from './drag.js';
import { sanitizeText, sanitizeAIOutput }      from './sanitize.js';

// ─── Completion state (kept in-memory, persisted by storage.js) ───────────────
let onTaskToggle = null; // set by app.js via setTaskToggleHandler()

/**
 * Register a callback for when a task checkbox is toggled.
 * @param {function} fn  - Called with (taskText, isChecked)
 */
export function setTaskToggleHandler(fn) {
    onTaskToggle = fn;
}

// ─── renderTodoList ────────────────────────────────────────────────────────────
/**
 * Parse AI output and render styled category cards into the container.
 * Supports: default mode (🔴🟡🟢), simple list (1. 2. 3.), meeting mode (📋),
 * email mode (paragraph), and priority score badges [N].
 *
 * @param {string}      text            - Raw AI response
 * @param {HTMLElement} container       - Target DOM element
 * @param {Set}         completedTasks  - Set of task texts already ticked
 * @param {string}      mode            - 'default'|'simple'|'meeting'|'email'
 */
export function renderTodoList(text, container, completedTasks = new Set(), mode = 'default') {
    container.innerHTML = '';

    // Sanitize AI output before rendering
    const sanitized = sanitizeAIOutput(text);

    if (mode === 'email') {
        renderEmailMode(sanitized, container);
        return;
    }

    if (mode === 'simple') {
        renderSimpleMode(sanitized, container, completedTasks);
        return;
    }

    if (mode === 'meeting') {
        renderMeetingMode(sanitized, container, completedTasks);
        return;
    }

    // Default: 🔴🟡🟢 categories
    renderDefaultMode(sanitized, container, completedTasks);
}

// ─── Default mode ─────────────────────────────────────────────────────────────
function renderDefaultMode(text, container, completedTasks) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const hasStructure = lines.some(l =>
        l.startsWith('🔴') || l.startsWith('🟡') || l.startsWith('🟢')
    );

    if (!hasStructure) {
        container.appendChild(makePlain(text));
        return;
    }

    let currentGroup = null;

    lines.forEach(line => {
        if (line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢')) {
            const catClass = line.startsWith('🔴') ? 'cat-urgent'
                           : line.startsWith('🟡') ? 'cat-week'
                           : 'cat-anytime';

            currentGroup = document.createElement('div');
            currentGroup.className = `todo-category ${catClass}`;

            const header = document.createElement('div');
            header.className = 'todo-category-header';
            header.textContent = line;
            currentGroup.appendChild(header);
            container.appendChild(currentGroup);

        } else if (line.startsWith('-') && currentGroup) {
            currentGroup.appendChild(makeTaskItem(line, completedTasks));
        }
    });

    // Enable drag AFTER all task items are in the DOM
    container.querySelectorAll('.todo-category').forEach(enableDragSort);
}

// ─── Simple list mode ─────────────────────────────────────────────────────────
function renderSimpleMode(text, container, completedTasks) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const list  = document.createElement('div');
    list.className = 'simple-list cat-anytime';

    lines.forEach(line => {
        if (/^\d+\./.test(line)) {
            // "1. [8] Task text (timing)"
            list.appendChild(makeTaskItem('- ' + line.replace(/^\d+\.\s*/, ''), completedTasks));
        }
    });

    if (list.children.length === 0) container.appendChild(makePlain(text));
    else container.appendChild(list);
}

// ─── Meeting mode ─────────────────────────────────────────────────────────────
function renderMeetingMode(text, container, completedTasks) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let group   = null;

    lines.forEach(line => {
        if (line.startsWith('📋')) {
            group = document.createElement('div');
            group.className = 'todo-category cat-week';
            const header = document.createElement('div');
            header.className = 'todo-category-header';
            header.textContent = line;
            group.appendChild(header);
            container.appendChild(group);
        } else if (line.startsWith('-') && group) {
            group.appendChild(makeTaskItem(line, completedTasks));
        }
    });

    if (!group) container.appendChild(makePlain(text));
}

// ─── Email mode ───────────────────────────────────────────────────────────────
function renderEmailMode(text, container) {
    const box = document.createElement('div');
    box.className = 'email-output';

    const lines = text.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        if (line.startsWith('Subject:')) {
            p.className = 'email-subject';
        } else if (line.startsWith('•')) {
            p.className = 'email-bullet';
        }
        p.textContent = line;
        if (line.trim()) box.appendChild(p);
        else {
            const br = document.createElement('div');
            br.className = 'email-spacer';
            box.appendChild(br);
        }
    });

    container.appendChild(box);
}

// ─── Task item builder ────────────────────────────────────────────────────────
/**
 * Build a single task row with: checkbox, priority badge, label, due badge.
 * Supports inline editing on double-click.
 *
 * @param {string} rawLine       - e.g. "- [8] Finish report → Due: Friday"
 * @param {Set}    completedTasks
 * @returns {HTMLElement}
 */
function makeTaskItem(rawLine, completedTasks) {
    // Strip leading "- " or "• "
    const clean = rawLine.replace(/^[-•]\s*/, '');

    // Extract priority score [N]
    const scoreMatch = clean.match(/^\[(\d+)\]\s*/);
    const score      = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
    const rest       = scoreMatch ? clean.slice(scoreMatch[0].length) : clean;

    // Extract due date — handle both '→ Due: Friday' and '→ Friday'
    const dueSplit = rest.split(/→\s*(?:Due:\s*)?/i);
    let taskText   = dueSplit[0].trim();
    let dueText    = dueSplit[1]?.trim() ?? null;

    // Fallback: detect day name embedded inline (e.g. "Call mum on Sunday")
    // Promotes it to a badge so layout is consistent with other tasks.
    if (!dueText) {
        const DAY_RE   = /\b(on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/i;
        const dayMatch = taskText.match(DAY_RE);
        if (dayMatch) {
            const raw  = dayMatch[2] || dayMatch[0].replace(/^on\s+/i, '');
            dueText    = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            taskText   = taskText
                .replace(dayMatch[0], '')   // remove "on Sunday" or "Sunday"
                .replace(/\s{2,}/g, ' ')    // collapse double spaces
                .replace(/\s+(on|at|by)\s*$/i, '') // strip trailing prepositions
                .trim();
        }
    }

    const isComplete = completedTasks.has(taskText);

    const item = document.createElement('div');
    item.className = 'todo-item' + (isComplete ? ' todo-done' : '');
    item.dataset.task = taskText;

    // ── Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-check';
    checkbox.checked = isComplete;
    checkbox.addEventListener('change', () => {
        item.classList.toggle('todo-done', checkbox.checked);
        updateProgressBar(item.closest('.card, .todo-list'));
        if (onTaskToggle) onTaskToggle(taskText, checkbox.checked);
    });

    // ── Coloured dot
    const dot = document.createElement('span');
    dot.className = 'todo-dot';

    // ── Label (inline-editable on double-click)
    const label = document.createElement('span');
    label.className = 'todo-label';
    label.textContent = taskText;
    label.title = 'Double-click to edit';
    wrapDayRefs(label);
    enableInlineEdit(label);

    // ── Priority badge
    let scoreBadge = null;
    if (score !== null) {
        scoreBadge = document.createElement('span');
        scoreBadge.className = `priority-badge priority-${getPriorityLevel(score)}`;
        scoreBadge.textContent = score;
        scoreBadge.title = `Priority: ${score}/10`;
    }

    // ── Due badge
    let dueBadge = null;
    if (dueText) {
        dueBadge = document.createElement('span');
        dueBadge.className = 'todo-due';
        dueBadge.textContent = `📅 ${dueText}`;
        attachCalendarToBadge(dueBadge);
    }

    item.appendChild(checkbox);
    item.appendChild(dot);
    item.appendChild(label);
    if (dueBadge)   item.appendChild(dueBadge);   // day badge first
    if (scoreBadge) item.appendChild(scoreBadge);  // priority number far right

    return item;
}

// ─── Inline editing ───────────────────────────────────────────────────────────
function enableInlineEdit(labelEl) {
    labelEl.addEventListener('dblclick', () => {
        const current = labelEl.textContent;
        labelEl.contentEditable = 'true';
        labelEl.classList.add('editing');
        labelEl.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(labelEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        function save() {
            labelEl.contentEditable = 'false';
            labelEl.classList.remove('editing');
            // Re-wrap day refs after editing
            wrapDayRefs(labelEl);
        }

        labelEl.addEventListener('blur', save, { once: true });
        labelEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); labelEl.blur(); }
            if (e.key === 'Escape') { labelEl.textContent = current; labelEl.blur(); }
        }, { once: true });
    });
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
export function updateProgressBar(scope) {
    const items   = document.querySelectorAll('.todo-item');
    const done    = document.querySelectorAll('.todo-item.todo-done');
    const bar     = document.getElementById('progressBar');
    const label   = document.getElementById('progressLabel');
    const section = document.getElementById('progressSection');

    if (!bar || !section) return;

    const total = items.length;
    if (total === 0) { section.classList.add('hidden'); return; }

    section.classList.remove('hidden');
    const pct = Math.round((done.length / total) * 100);
    bar.style.width = pct + '%';
    label.textContent = `${done.length} / ${total} done`;

    if (pct === 100) bar.classList.add('bar-complete');
    else             bar.classList.remove('bar-complete');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPriorityLevel(score) {
    if (score >= 8) return 'high';
    if (score >= 5) return 'mid';
    return 'low';
}

function makePlain(text) {
    const div = document.createElement('div');
    div.className = 'todo-plain';
    div.textContent = text;
    return div;
}

// ─── History rendering ────────────────────────────────────────────────────────
export function renderHistorySection(historyData, onRestore, onClear) {
    const section  = document.getElementById('historySection');
    const list     = document.getElementById('historyList');
    const clearBtn = document.getElementById('clearHistoryBtn');
    list.innerHTML = '';

    if (historyData.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    if (clearBtn) clearBtn.onclick = onClear;

    historyData.forEach(entry => {
        const details = document.createElement('details');
        details.className = 'history-item';

        const summary = document.createElement('summary');
        summary.className = 'history-summary';
        summary.textContent = `Result from ${entry.date}`;
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'history-body';

        const inner = document.createElement('div');
        inner.className = 'todo-list';
        renderTodoList(entry.text, inner, new Set(), entry.mode || 'default');
        body.appendChild(inner);

        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-btn';
        restoreBtn.textContent = '↩ Restore this result';
        restoreBtn.onclick = () => onRestore(entry.text, entry.mode || 'default');
        body.appendChild(restoreBtn);

        details.appendChild(body);
        list.appendChild(details);
    });
}

// ─── Shake ────────────────────────────────────────────────────────────────────
export function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    el.style.borderColor = 'var(--clr-accent-red)';
    el.style.boxShadow = '0 0 0 3px rgba(255,77,109,0.2)';
    setTimeout(() => {
        el.style.borderColor = '';
        el.style.boxShadow = '';
        el.style.animation = '';
    }, 500);
}
