// Lightweight logger wrapper. Sends errors/warnings to Sentry when available
const { Sentry } = require('./sentry');

const isProd = process.env.NODE_ENV === 'production';

function formatArgs(args) {
    return args
        .map((a) => {
            if (a instanceof Error) {
                return a.stack || a.message;
            }

            if (typeof a === 'object') {
                try {
                    return JSON.stringify(a);
                } catch {
                    return String(a);
                }
            }

            return String(a);
        })
        .join(' ');
}

module.exports = {
    info: (...args) => {
        console.log(...args);
        if (Sentry && typeof Sentry.captureMessage === 'function') {
            try {
                Sentry.captureMessage(formatArgs(args), 'info');
            } catch (err) {
                void err;
            }
        }
    },
    warn: (...args) => {
        console.warn(...args);
        if (Sentry && typeof Sentry.captureMessage === 'function') {
            try {
                Sentry.captureMessage(formatArgs(args), 'warning');
            } catch (err) {
                void err;
            }
        }
    },
    error: (...args) => {
        console.error(...args);
        if (Sentry && typeof Sentry.captureException === 'function') {
            try {
                const first = args[0];
                if (first instanceof Error) {
                    Sentry.captureException(first);
                } else {
                    Sentry.captureMessage(formatArgs(args), 'error');
                }
            } catch (err) {
                void err;
            }
        }
    },
    debug: (...args) => {
        if (!isProd) {
            console.log(...args);
        }
    },
};
