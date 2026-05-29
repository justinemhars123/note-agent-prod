// ─── routes/process.js — POST /process ───────────────────────────────────────
// Handles all AI processing modes:
//   default  → URGENT / THIS WEEK / ANYTIME with priority scores
//   simple   → flat numbered list
//   meeting  → action items with @owner tags
//   email    → status-update paragraph
// Also handles: multi-language auto-detect, custom prompts, OpenAI fallback.

const express            = require('express');
const { callGroq }       = require('../helpers/groq');
const { callOpenAI }     = require('../helpers/openai');

const router = express.Router();
const MAX_INPUT_CHARS        = 2000;
const MAX_CUSTOM_PROMPT_CHARS = 500;
const VALID_MODES            = ['default', 'simple', 'meeting', 'email'];

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+instructions/i,
    /disregard\s+(all\s+)?instructions/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /new\s+persona/i,
    /system\s+prompt/i,
    /act\s+as\s+(?!a\s+productivity)/i, // allow "act as a productivity assistant"
    /jailbreak/i,
];

// ─── System prompts per mode ──────────────────────────────────────────────────
function buildSystemPrompt(mode, today, customPrompt) {
    if (customPrompt && customPrompt.trim()) return customPrompt.trim();

    const base = `You are a productivity assistant. Today's date is: ${today}.
IMPORTANT: Detect the language the user wrote their notes in and respond in THAT SAME LANGUAGE.
IMPORTANT: Always write day names in ENGLISH only (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, Today, Tomorrow) — never translate them.
IMPORTANT: When a task mentions a specific day or deadline, ALWAYS use arrow format: "Task description → Day". Never leave the day embedded inside the task text.
Each task must include a priority score from 1 (low) to 10 (critical) in square brackets like [8].`;

    switch (mode) {
        case 'simple':
            return `${base}

Extract all tasks from the notes and return a simple numbered list. Format EXACTLY like this (no extra explanation):

1. [score] Task description (timing if known)
2. [score] Task description
...

Order by priority score descending.`;

        case 'meeting':
            return `${base}

Extract all action items from the meeting notes. For each item, identify who is responsible if mentioned.
Format EXACTLY like this (no extra explanation):

📋 ACTION ITEMS

- [score] @person Task description → Due: day (or omit due if none)
- [score] @team Task description

Use @team if no specific person is mentioned.`;

        case 'email':
            return `${base}

Summarise the tasks as a professional status-update email body. Format EXACTLY like this (no extra explanation):

Subject: Action Items – [date]

Hi team,

Following up on today's notes, here are the key action items:

• [Urgent] Task...
• [This week] Task → Due: day
• [When possible] Task

Let me know if you have any questions.

Best regards`;

        default: // 'default'
            return `${base}

Categorise every task as URGENT (today), THIS WEEK, or ANYTIME.
Respond ONLY with the structured list using EXACTLY this format (no extra explanation):

🔴 URGENT (Today)
  - [score] Task description

🟡 THIS WEEK
  - [score] Task description → Due: day

🟢 ANYTIME
  - [score] Task description

If a category has no tasks, omit it entirely.`;
    }
}

// ─── AI call with Groq-first, OpenAI fallback ─────────────────────────────────
async function callAI(payload) {
    const groqKey   = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY; // optional

    // Try Groq first
    try {
        const res = await callGroq(payload, groqKey);

        // Only fall back on server errors, not 4xx client errors
        if (res.status >= 500 && openaiKey) {
            console.warn('⚠️  Groq returned 5xx — falling back to OpenAI');
            return { response: await callOpenAI(payload, openaiKey), provider: 'openai' };
        }

        return { response: res, provider: 'groq' };

    } catch (networkErr) {
        // Network failure — try OpenAI if available
        if (openaiKey) {
            console.warn('⚠️  Groq network error — falling back to OpenAI');
            const res = await callOpenAI(payload, openaiKey);
            return { response: res, provider: 'openai' };
        }
        throw networkErr;
    }
}

// ─── POST /process ────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { notes, mode = 'default', customPrompt = '' } = req.body;

    // ─── Input type safety ─────────────────────────────────────────────────────────
    if (typeof notes !== 'string') {
        return res.status(400).json({ error: 'Notes must be a string.' });
    }

    // ─── Notes validation ─────────────────────────────────────────────────────────
    if (!notes || !notes.trim()) {
        return res.status(400).json({ error: 'No notes provided.' });
    }
    if (notes.length > MAX_INPUT_CHARS) {
        return res.status(400).json({
            error: `Notes are too long. Keep them under ${MAX_INPUT_CHARS.toLocaleString()} characters.`
        });
    }

    // ─── Mode allowlist validation ─────────────────────────────────────────────────
    if (mode && !VALID_MODES.includes(mode)) {
        return res.status(400).json({
            error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}.`
        });
    }

    // ─── Custom prompt validation (prompt injection protection) ──────────────────
    if (customPrompt) {
        if (typeof customPrompt !== 'string') {
            return res.status(400).json({ error: 'Custom prompt must be a string.' });
        }
        if (customPrompt.length > MAX_CUSTOM_PROMPT_CHARS) {
            return res.status(400).json({
                error: `Custom prompt must be under ${MAX_CUSTOM_PROMPT_CHARS} characters.`
            });
        }
        if (INJECTION_PATTERNS.some(pattern => pattern.test(customPrompt))) {
            console.warn(`⚠️  Prompt injection attempt blocked: ${customPrompt.slice(0, 80)}...`);
            return res.status(400).json({
                error: 'Custom prompt contains disallowed content.'
            });
        }
    }

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const systemPrompt = buildSystemPrompt(mode, today, customPrompt);

    const payload = {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: `Here are my notes:\n${notes}` }
        ],
        temperature: 0.3,
        max_tokens: 1024
    };

    try {
        const { response, provider } = await callAI(payload);
        const data = await response.json();

        console.log(`Provider: ${provider} | Status: ${response.status} | Mode: ${mode}`);

        if (response.status === 429) {
            return res.status(429).json({
                error: 'Too many requests — rate limited. Wait a moment and try again.'
            });
        }

        if (!data.choices || data.choices.length === 0) {
            console.error('Unexpected AI response:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: data.error?.message || 'AI returned no result.' });
        }

        const resultText = data.choices[0].message.content;

        // Asynchronously save to Supabase (if configured)
        if (req.body.userId) {
            // We don't await this because we don't want to slow down the user's response
            // saveNote handles its own error catching
            const { saveNote } = require('../helpers/supabase');
            saveNote(req.body.userId, notes, resultText, provider, mode);
        }

        res.json({ result: resultText, provider, mode });

    } catch (err) {
        console.error('Process route error:', err);
        res.status(500).json({ error: 'Could not reach AI. Check your internet connection.' });
    }
});

module.exports = router;
