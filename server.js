// ─── server.js — App entry point ─────────────────────────────────────────────
// Responsible only for: loading env, validating the API key,
// mounting middleware, wiring routes, and starting the server.
// All business logic lives in routes/ and helpers/.

require('dotenv').config(); // Load environment variables first!

const { Sentry, initSentry } = require('./helpers/sentry');
// Initialize Sentry as early as possible so modules can report errors during startup
initSentry();

const logger = require('./helpers/logger');
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { optionalAuth } = require('./helpers/authMiddleware');

// ─── Environment validation ──────────────────────────────────────────────────
// REQUIRED vars: server exits immediately if any are missing/invalid.
// OPTIONAL vars: server warns but continues — features degrade gracefully.
const REQUIRED_ENV = [
    {
        key: 'GROQ_API_KEY',
        hint: 'Get your key at https://console.groq.com/keys',
        validator: (v) => v && v.startsWith('gsk_'),
    },
    { key: 'SUPABASE_URL', hint: 'Found in your Supabase project → Settings → API' },
    {
        key: 'SUPABASE_KEY',
        hint: 'The anon/public key in Supabase → Settings → API (or set SUPABASE_ANON_KEY)',
        validator: (v) => !!(v || process.env.SUPABASE_ANON_KEY),
    },
];

const OPTIONAL_ENV = [
    {
        key: 'SUPABASE_SERVICE_KEY',
        hint: 'The service_role key — needed for admin-level auth verification',
    },
    { key: 'SENTRY_DSN', hint: 'Get a free DSN at https://sentry.io for error monitoring' },
];

const missingVars = [];
for (const { key, hint, validator } of REQUIRED_ENV) {
    const val = process.env[key];
    // If a validator exists, use it (allows alternate envs like SUPABASE_ANON_KEY);
    // otherwise require the env var to be truthy.
    const isValid = typeof validator === 'function' ? Boolean(validator(val)) : Boolean(val);
    if (!isValid) {
        missingVars.push(`  ❌ ${key}\n     → ${hint}`);
    }
}

if (missingVars.length > 0) {
    logger.error('\n🚨 Missing or invalid environment variables:');
    logger.error(missingVars.join('\n'));
    logger.error('\n   Add the above to your .env file and restart the server.\n');
    process.exit(1);
}

// Warn about optional vars — features will degrade gracefully without them
for (const { key, hint } of OPTIONAL_ENV) {
    if (!process.env[key]) {
        logger.warn(`⚠️  Optional: ${key} not set → ${hint}`);
    }
}

logger.info('🔑 All environment variables validated OK');

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();

// ─── CORS Configuration ───────────────────────────────────────────────────────
// Origins are driven by the ALLOWED_ORIGINS env var (comma-separated).
// Falls back to localhost for local development.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001'];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        // Exact match
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Wildcard: allow all *.vercel.app preview deployments
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
};

// ─── Security headers (helmet) ───────────────────────────────────────────────
// Covers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
//         Referrer-Policy, X-XSS-Protection, Permissions-Policy + more.
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://browser.sentry-cdn.com'],
                styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                connectSrc: [
                    "'self'",
                    'https://*.supabase.co',
                    'https://*.sentry.io',
                    'https://*.ingest.sentry.io',
                ],
                imgSrc: ["'self'", 'data:', 'https://www.gstatic.com'],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        permittedCrossDomainPolicies: false,
    })
);

app.use(cors(corsOptions));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10kb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
// ─── Rate Limiter ────────────────────────────────────────────────────────────
// 15 requests per IP per minute — cannot be bypassed from the browser
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // max 15 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests — you have been rate limited. Please wait a minute and try again.',
    },
});

app.get('/api/config', (req, res) => {
    // Only expose the public/anon key to browser clients. Do NOT return service_role keys.
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        // Public Sentry DSN is safe to expose to the browser
        sentryDsn: process.env.SENTRY_DSN || '',
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use('/process', apiLimiter, optionalAuth, require('./routes/process'));
app.use('/history', optionalAuth, require('./routes/history'));

// ─── Sentry error handler (must come after routes, before server.listen) ───────────
if (process.env.SENTRY_DSN) {
    app.use(Sentry.expressErrorHandler());
}

// ─── Start ─────────────────────────────────────────────────────────────────
if (!IS_PRODUCTION) {
    logger.info(`🛠️  Running in development mode`);
}

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    logger.info(`✅ Agent running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(
            '❌ Port',
            PORT,
            'is already in use. Set a different PORT in .env and restart the app.'
        );
        process.exit(1);
    }
    throw error;
});

// ─── Global unhandled rejection guard ────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
    logger.error('🔥 Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('🔥 Uncaught Exception:', err);
    process.exit(1);
});
