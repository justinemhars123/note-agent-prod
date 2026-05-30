import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ─── Sentry (lazy-initialized from /api/config) ───────────────────────────────
let Sentry = null;

async function initSentryBrowser(dsn) {
    if (!dsn || Sentry) {
        return;
    }
    try {
        // Use the correct ESM bundle — the standard bundle is UMD and cannot be dynamically imported
        const mod =
            await import('https://cdn.jsdelivr.net/npm/@sentry/browser@8/build/npm/esm/index.js');
        Sentry = mod;
        if (Sentry && Sentry.init) {
            Sentry.init({
                dsn,
                environment:
                    window.location.hostname === 'localhost' ? 'development' : 'production',
                tracesSampleRate: 0.2,
            });
            console.log('✅ Sentry frontend monitoring active');
        }
    } catch (e) {
        console.warn('Sentry browser SDK failed to load', e);
    }
}

// Global error fence — catches anything that slips through try/catch blocks
window.addEventListener('error', (event) => {
    if (Sentry) {
        Sentry.captureException(event.error || event.message);
    }
});
window.addEventListener('unhandledrejection', (event) => {
    if (Sentry) {
        Sentry.captureException(event.reason);
    }
});

// Expose captureError so any module can report an error manually
export function captureError(err) {
    if (Sentry) {
        Sentry.captureException(err);
    } else {
        console.error('[captureError]', err);
    }
}

let supabase = null;
let currentSession = null;

// Initialize Supabase Client
export async function initAuth() {
    try {
        const response = await fetch('https://note-to-action-agent-backend.onrender.com/api/config');
        const config = await response.json();

        // Boot Sentry as soon as we have the DSN
        if (config.sentryDsn) {
            await initSentryBrowser(config.sentryDsn);
        }

        if (config.supabaseUrl && config.supabaseKey) {
            supabase = createClient(config.supabaseUrl, config.supabaseKey);

            // Get initial session
            const {
                data: { session },
            } = await supabase.auth.getSession();
            currentSession = session;

            // Listen for auth state changes
            supabase.auth.onAuthStateChange((event, session) => {
                currentSession = session;
                window.dispatchEvent(
                    new CustomEvent('auth-changed', { detail: { session, event } })
                );
            });

            return true;
        } else {
            console.warn('Supabase config missing from /api/config');
            return false;
        }
    } catch (err) {
        console.error('Failed to initialize Supabase Auth:', err);
        return false;
    }
}

export function getSession() {
    return currentSession;
}

export function getAuthUserId() {
    return currentSession?.user?.id || null;
}

export function getAuthToken() {
    return currentSession?.access_token || null;
}

export async function signInWithGoogle() {
    if (!supabase) {
        return { error: 'Supabase not initialized' };
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
        },
    });
    return { data, error };
}

export async function signInWithEmail(email, password) {
    if (!supabase) {
        return { error: 'Supabase not initialized' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export async function signUpWithEmail(email, password) {
    if (!supabase) {
        return { error: 'Supabase not initialized' };
    }
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
}

export async function signOut() {
    if (!supabase) {
        return { error: 'Supabase not initialized' };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
}
