// ─── server.js — App entry point ─────────────────────────────────────────────
// Responsible only for: loading env, validating the API key,
// mounting middleware, wiring routes, and starting the server.
// All business logic lives in routes/ and helpers/.

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const { config } = require('dotenv');

config(); // load .env

// ─── API key validation ───────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY || !GROQ_API_KEY.startsWith('gsk_')) {
    console.error('');
    console.error('❌  GROQ_API_KEY is missing or invalid in your .env file.');
    console.error('    Get your key at: https://console.groq.com/keys');
    console.error('    Then add it to .env as:  GROQ_API_KEY=gsk_...');
    console.error('');
    process.exit(1);
}

console.log('🔑 API key loaded OK');

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();

// ─── CORS Configuration ───────────────────────────────────────────────────────
// Allow requests from localhost and specific domains
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3001',
            'http://localhost:3000',
            'http://127.0.0.1:3001',
            // Add your production domain here when deploying
            // 'https://your-domain.com'
        ];

        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');           // Prevent MIME sniffing
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');                // Prevent clickjacking
    res.setHeader('X-XSS-Protection', '1; mode=block');            // Enable XSS filtering
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
// ─── Rate Limiter ────────────────────────────────────────────────────────────
// 15 requests per IP per minute — cannot be bypassed from the browser
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 15,              // max 15 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests — you have been rate limited. Please wait a minute and try again.'
    }
});

app.use('/process', apiLimiter, require('./routes/process'));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`✅ Agent running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Set a different PORT in .env and restart the app.`);
        process.exit(1);
    }

    throw error;
});
