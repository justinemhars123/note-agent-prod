// Browser notification reminders for tasks with due dates.
// Uses localStorage plus timers; no backend or push service is required.

const REMINDER_KEY = 'noteagent_due_reminders';
const MORNING_HOUR = 9;
const MAX_TIMEOUT = 2_147_483_647;
const DAY_MS = 86_400_000;

const WEEKDAYS = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

let activeTimers = new Map();

export function initDueReminders() {
    if (!supportsNotifications()) return;
    scheduleStoredReminders();
}

export async function enableDueReminders(resultText) {
    if (!supportsNotifications()) {
        return { status: 'unsupported', count: 0 };
    }

    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') {
        return { status: permission, count: 0 };
    }

    const count = scheduleDueReminders(resultText);
    return { status: 'scheduled', count };
}

export function scheduleDueReminders(resultText) {
    if (!resultText || !supportsNotifications() || Notification.permission !== 'granted') {
        return 0;
    }

    const reminders = loadReminders();
    const existingIds = new Set(reminders.map(reminder => reminder.id));
    const parsed = extractDueTasks(resultText);
    let added = 0;

    parsed.forEach(task => {
        const id = buildReminderId(task.title, task.fireAt);
        if (existingIds.has(id)) return;

        reminders.push({
            id,
            title: task.title,
            dueText: task.dueText,
            fireAt: task.fireAt,
            dueAt: task.dueAt,
            createdAt: Date.now(),
            shown: false
        });
        existingIds.add(id);
        added += 1;
    });

    saveReminders(reminders);
    scheduleStoredReminders();
    return added;
}

export function getReminderPermission() {
    if (!supportsNotifications()) return 'unsupported';
    return Notification.permission;
}

function supportsNotifications() {
    return 'Notification' in window;
}

async function ensureNotificationPermission() {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    return Notification.requestPermission();
}

function scheduleStoredReminders() {
    clearTimers();

    const now = Date.now();
    const nextReminders = loadReminders()
        .filter(reminder => !reminder.shown)
        .filter(reminder => reminder.dueAt >= startOfToday().getTime());

    saveReminders(nextReminders);

    nextReminders.forEach(reminder => {
        const delay = Math.max(0, reminder.fireAt - now);
        const timer = setLongTimeout(() => showReminder(reminder), delay);
        activeTimers.set(reminder.id, timer);
    });
}

function clearTimers() {
    activeTimers.forEach(timer => clearTimeout(timer));
    activeTimers = new Map();
}

function setLongTimeout(callback, delay) {
    if (delay <= MAX_TIMEOUT) {
        return setTimeout(callback, delay);
    }

    return setTimeout(() => {
        setLongTimeout(callback, delay - MAX_TIMEOUT);
    }, MAX_TIMEOUT);
}

async function showReminder(reminder) {
    if (Notification.permission !== 'granted') return;

    const body = reminder.dueText
        ? `Due ${reminder.dueText}`
        : 'This task is due today.';

    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Task reminder', {
                body: `${reminder.title}\n${body}`,
                tag: reminder.id,
                renotify: true,
                icon: '/icons/icon-192.svg',
                badge: '/icons/icon-192.svg',
                data: { url: '/' }
            });
            markReminderShown(reminder.id);
            return;
        } catch (err) {
            console.warn('Service worker notification failed:', err);
        }
    }

    new Notification('Task reminder', {
        body: `${reminder.title}\n${body}`,
        tag: reminder.id,
        icon: '/icons/icon-192.svg'
    });
    markReminderShown(reminder.id);
}

function markReminderShown(id) {
    activeTimers.delete(id);
    saveReminders(loadReminders().map(reminder =>
        reminder.id === id ? { ...reminder, shown: true } : reminder
    ));
}

function extractDueTasks(text) {
    const today = new Date();
    const seen = new Set();

    return text
        .split('\n')
        .map(line => parseTaskLine(line, today))
        .filter(Boolean)
        .filter(task => {
            const key = `${task.title}|${task.fireAt}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function parseTaskLine(line, today) {
    const raw = line.trim();
    if (!/^([-*\u2022]|\d+\.)/.test(raw)) return null;

    let clean = raw;
    if (!clean) return null;

    clean = clean
        .replace(/^[-*\u2022]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^\[(\d+)\]\s*/, '')
        .trim();

    if (!clean || isSectionHeader(clean)) return null;

    const parts = clean.split(/\u2192|->/);
    const title = sanitizeTitle(parts[0]);
    let dueText = parts[1]?.replace(/^Due:\s*/i, '').trim() || '';

    if (!dueText) {
        const inlineMatch = clean.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        if (inlineMatch) dueText = inlineMatch[0];
    }

    if (!title || !dueText) return null;

    const dueDate = parseDueDate(dueText, today);
    if (!dueDate) return null;

    const fireDate = new Date(dueDate);
    fireDate.setHours(MORNING_HOUR, 0, 0, 0);

    const now = new Date();
    if (fireDate < now && isSameDay(dueDate, now)) {
        fireDate.setTime(now.getTime() + 5_000);
    }

    if (dueDate < startOfToday()) return null;

    return {
        title,
        dueText,
        fireAt: fireDate.getTime(),
        dueAt: dueDate.getTime()
    };
}

function parseDueDate(str, today) {
    let lower = str.toLowerCase().trim();
    lower = lower.replace(/^(by|on|before|due)\s+/, '').replace(/[.,;:]+$/, '');

    const base = new Date(today);
    base.setHours(0, 0, 0, 0);

    if (lower === 'today') return base;
    if (lower === 'tomorrow') return new Date(base.getTime() + DAY_MS);

    const dayMatch = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (dayMatch) {
        const target = WEEKDAYS[dayMatch[1]];
        const diff = (target - base.getDay() + 7) % 7;
        return new Date(base.getTime() + (diff || 7) * DAY_MS);
    }

    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

function sanitizeTitle(value) {
    return value
        .replace(/^\s*@\S+\s*/, match => match.trim() + ' ')
        .replace(/\s*\([^)]*(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^)]*\)\s*$/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function isSectionHeader(value) {
    return !value.includes(' ') || /^(urgent|this week|anytime|action items)$/i.test(value);
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function buildReminderId(title, fireAt) {
    return `noteagent:${fireAt}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`;
}

function loadReminders() {
    try {
        const raw = localStorage.getItem(REMINDER_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveReminders(reminders) {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
}
