// ─── calendar.js — Day-name hover calendar tooltip ────────────────────────────
// Scans task label text for day names, wraps them in hoverable spans,
// and shows a mini calendar popup with the matching date highlighted.
// No fetch(), no localStorage, no app logic.

const WEEKDAY_MAP = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

// Regex: matches full day names + today/tomorrow (word-boundary, case-insensitive)
const DAY_REGEX = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

let activeTooltip = null;

// ─── Public: scan an element's text for day names and wrap them ───────────────
/**
 * Find day-name strings inside `el` and replace them with
 * hoverable <span class="day-ref"> elements.
 *
 * @param {HTMLElement} el
 */
export function wrapDayRefs(el) {
    // Work on the text content via a temporary walk
    el.childNodes.forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE) {
            return;
        }

        const text = node.textContent;
        if (!DAY_REGEX.test(text)) {
            return;
        }

        DAY_REGEX.lastIndex = 0; // reset after .test()

        const frag = document.createDocumentFragment();
        let last = 0;
        let match;

        DAY_REGEX.lastIndex = 0;
        while ((match = DAY_REGEX.exec(text)) !== null) {
            // Text before the match
            if (match.index > last) {
                frag.appendChild(document.createTextNode(text.slice(last, match.index)));
            }

            // The day-name span
            const span = document.createElement('span');
            span.className = 'day-ref';
            span.textContent = match[0];
            span.dataset.day = match[0].toLowerCase();

            span.addEventListener('mouseenter', onDayHover);
            span.addEventListener('mouseleave', onDayLeave);

            frag.appendChild(span);
            last = match.index + match[0].length;
        }

        // Remaining text
        if (last < text.length) {
            frag.appendChild(document.createTextNode(text.slice(last)));
        }

        node.parentNode.replaceChild(frag, node);
    });
}

/**
 * Make an entire element (e.g. a .todo-due badge) trigger the calendar tooltip.
 * Extracts the day name from the element's text content automatically.
 *
 * @param {HTMLElement} el  - The badge element to make hoverable
 */
export function attachCalendarToBadge(el) {
    const text = el.textContent || '';
    const regex = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const match = text.match(regex);
    if (!match) {
        return;
    }

    el.dataset.day = match[0].toLowerCase();
    el.classList.add('cal-badge-hoverable');
    el.addEventListener('mouseenter', onDayHover);
    el.addEventListener('mouseleave', onDayLeave);
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onDayHover(e) {
    const span = e.currentTarget;
    const dayName = span.dataset.day;
    const date = resolveDayToDate(dayName);

    hideTooltip();
    showTooltip(span, date);
}

function onDayLeave() {
    // Small delay so the user can move onto the tooltip without it closing
    setTimeout(() => {
        if (activeTooltip && !activeTooltip.matches(':hover')) {
            hideTooltip();
        }
    }, 120);
}

// ─── Date resolution ──────────────────────────────────────────────────────────
/**
 * Given a day name string, return the next Date that matches it
 * (today inclusive for weekday names, exact offsets for today/tomorrow).
 *
 * @param {string} dayName  lowercase day name
 * @returns {Date}
 */
function resolveDayToDate(dayName) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dayName === 'today') {
        return now;
    }
    if (dayName === 'tomorrow') {
        return new Date(now.getTime() + 86_400_000);
    }

    const target = WEEKDAY_MAP[dayName];
    const current = now.getDay();
    const diff = (target - current + 7) % 7;

    // If today is the same weekday, show next week (it's a future deadline)
    const daysAhead = diff === 0 ? 7 : diff;
    return new Date(now.getTime() + daysAhead * 86_400_000);
}

// ─── Tooltip: show ────────────────────────────────────────────────────────────
function showTooltip(anchor, date) {
    const tooltip = buildTooltip(date);
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // Position: above the anchor, centred
    const rect = anchor.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;

    let left = rect.left + window.scrollX + rect.width / 2 - tw / 2;
    let top = rect.top + window.scrollY - th - 10;

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    if (top < window.scrollY + 8) {
        top = rect.bottom + window.scrollY + 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    // Keep alive while hovering the tooltip itself
    tooltip.addEventListener('mouseleave', () => {
        setTimeout(hideTooltip, 80);
    });

    // Animate in
    requestAnimationFrame(() => tooltip.classList.add('cal-visible'));
}

// ─── Tooltip: hide ────────────────────────────────────────────────────────────
function hideTooltip() {
    if (!activeTooltip) {
        return;
    }
    activeTooltip.remove();
    activeTooltip = null;
}

// ─── Build the mini calendar DOM ──────────────────────────────────────────────
function buildTooltip(date) {
    const tooltip = document.createElement('div');
    tooltip.className = 'cal-tooltip';

    // ── Header: Month Year ───────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'cal-header';

    const monthLabel = document.createElement('span');
    monthLabel.className = 'cal-month';
    monthLabel.textContent = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

    // Full date label (e.g. "Thursday, 8 May")
    const dateLabel = document.createElement('span');
    dateLabel.className = 'cal-date-label';
    dateLabel.textContent = date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });

    header.appendChild(monthLabel);
    header.appendChild(dateLabel);
    tooltip.appendChild(header);

    // ── Day-of-week row ───────────────────────────────────────────────────────
    const dayRow = document.createElement('div');
    dayRow.className = 'cal-day-headers';
    DAY_HEADERS.forEach((d) => {
        const cell = document.createElement('span');
        cell.textContent = d;
        dayRow.appendChild(cell);
    });
    tooltip.appendChild(dayRow);

    // ── Date grid ─────────────────────────────────────────────────────────────
    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    const year = date.getFullYear();
    const month = date.getMonth();
    const highlightDay = date.getDate();

    // First day of the month & total days
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Leading empty cells
    for (let i = 0; i < firstDow; i++) {
        grid.appendChild(emptyCell());
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('span');
        cell.className = 'cal-cell';
        cell.textContent = d;

        const cellDate = new Date(year, month, d);
        if (cellDate.getTime() === today.getTime()) {
            cell.classList.add('cal-today');
        }
        if (d === highlightDay) {
            cell.classList.add('cal-highlight');
        }

        grid.appendChild(cell);
    }

    tooltip.appendChild(grid);
    return tooltip;
}

function emptyCell() {
    const span = document.createElement('span');
    span.className = 'cal-cell cal-empty';
    return span;
}
