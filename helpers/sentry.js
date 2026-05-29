// ─── helpers/sentry.js — Sentry error monitoring ──────────────────────────────
// Initializes Sentry for backend error tracking.
// Set SENTRY_DSN in your .env file to activate.
// Get a free DSN at: https://sentry.io

const Sentry = require('@sentry/node');

function initSentry() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        console.warn('⚠️  SENTRY_DSN not set — error monitoring is disabled.');
        console.warn('   Get a free DSN at https://sentry.io and add it to .env');
        return false;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        // Capture 100% of transactions in dev, 20% in production to save quota
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        // Do not send personally identifiable information
        sendDefaultPii: false,
    });

    console.log('✅ Sentry error monitoring active');
    return true;
}

module.exports = { Sentry, initSentry };
