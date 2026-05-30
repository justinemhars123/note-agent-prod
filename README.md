# Note-to-Action Agent

Minimal personal project: converts notes into actionable tasks using AI providers (Groq, OpenAI) and optional Supabase history.

Quick start

1. Copy `.env.example` to `.env` and fill required values.

2. Install dependencies:

```bash
npm ci
```

3. Run locally:

```bash
npm run dev
# or production
npm start
```

Tests and lint

```bash
npm run lint
npm test
```

Docker

Build and run with Docker:

```bash
docker build -t note-to-action-agent .
docker run -e GROQ_API_KEY=... -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -p 3001:3001 note-to-action-agent
```

Publish & use the GHCR image

When you push to `main`, the CI will build and publish an image to GitHub Container Registry (GHCR) at `ghcr.io/<owner>/note-to-action-agent`.

To pull the latest image:

```bash
docker pull ghcr.io/<your-github-username>/note-to-action-agent:latest
docker run -e GROQ_API_KEY=... -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -p 3001:3001 ghcr.io/<your-github-username>/note-to-action-agent:latest
```

Note: CI uses the repository owner as the GHCR namespace; replace `<your-github-username>` with your account or organization name.

Security notes
- Never store service_role keys or other full-privilege secrets in the browser or commit them to the repo.
- Use `SUPABASE_ANON_KEY` for client-side calls; keep `SUPABASE_SERVICE_KEY` only in server-side secrets/stores.
- Set real secrets using your hosting provider's secret management (Vercel/GH Actions secrets/etc.).

CI

A simple GitHub Action is present at `.github/workflows/ci.yml` which runs lint, tests and an audit on push/PR.
# Personal Productivity Agent

An AI-powered automation tool that transforms messy notes into structured, actionable to-do lists. Paste anything—meeting reminders, random thoughts, deadlines—and the agent organizes it instantly.

## Features

✨ **4 Output Modes**
- **Default** — Categorizes tasks by urgency (URGENT, THIS WEEK, ANYTIME) with priority scores
- **Simple** — Clean numbered list sorted by priority
- **Meeting** — Extracts action items with @owner tags and due dates
- **Email** — Formats results as a professional status-update email

🌍 **Auto-Language Detection** — Responds in the language you write in (while keeping day names in English)

⚡ **Dual AI Providers** — Uses Groq (primary, fast) with automatic OpenAI fallback

📅 **Task Management**
- Priority scoring (1-10)
- Deadline-aware scheduling
- Browser reminders & notifications
- Export to .ics calendar format
- Copy/paste & markdown download

🔗 **Shareable Links** — Generate URLs to share your to-do list

🎤 **Voice Input** — Speak your notes instead of typing (Web Speech API)

🌓 **Dark/Light Mode** — Persistent theme preference

## Quick Start

### Prerequisites
- Node.js 16+
- Free API key from [Groq](https://console.groq.com/keys) (required)
- Free API key from [OpenAI](https://platform.openai.com/account/api-keys) (optional, used as fallback)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/note-to-action-agent.git
cd note-to-action-agent

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Configuration

Edit `.env` and add your API keys:

```env
# Required
GROQ_API_KEY=gsk_xxxxxxxxxxxx

# Optional (fallback provider)
OPENAI_API_KEY=sk_xxxxxxxxxxxx

# Optional
PORT=3001
```

### Run

```bash
npm start
```

Then open [http://localhost:3001](http://localhost:3001) in your browser.

## 🚀 Deployment & Production Setup

This project includes complete Phase 2 & 3 setup for database automation, CI/CD pipelines, and production deployment.

### Setup Guides

- **[Phase 2 & 3 Complete Setup Guide](./PHASE2-PHASE3-SETUP.md)** ← Start here!
  - Automate database migrations with Supabase CLI
  - Configure GitHub CI/CD pipeline
  - Set up GitHub secrets
  - Deploy to production

- **[Railway.app Deployment Guide](./DEPLOYMENT-RAILWAY.md)**
  - Recommended for easiest setup
  - Auto-deploys on every git push
  - Includes PostgreSQL database

- **[Render.com Deployment Guide](./DEPLOYMENT-RENDER.md)**
  - Free tier option available
  - Alternative to Railway
  - Manual deploy on free tier

- **[Implementation Checklist](./IMPLEMENTATION-CHECKLIST.md)**
  - Step-by-step verification checklist
  - Success criteria for each phase
  - Troubleshooting reference

### Quick Deployment

```bash
# 1. Install Supabase CLI
npm install -D supabase

# 2. Initialize migrations
npx supabase init

# 3. Add GitHub secrets
# Go to: GitHub → Settings → Secrets and Variables → Actions
# Add: GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY

# 4. Deploy to Railway or Render
# Visit: https://railway.app or https://render.com
# Connect your GitHub repo
# Done! CI/CD pipeline starts automatically

# 5. Verify production
# Visit your deployed URL
# Check HTTPS certificate (lock icon 🔒)
# Verify security headers in DevTools
```

### CI/CD Pipeline

GitHub Actions automatically:
- ✅ Runs tests on every push/PR
- ✅ Validates database migrations
- ✅ Runs security scans
- ✅ Deploys to production (if all checks pass)

See `.github/workflows/ci.yml` for pipeline configuration.

## Project Structure

```
├── server.js                 # Express app entry point
├── routes/
│   └── process.js            # POST /process endpoint (all AI modes)
├── helpers/
│   ├── groq.js              # Groq API wrapper with retry logic
│   └── openai.js            # OpenAI fallback provider
├── public/
│   ├── index.html           # Main UI
│   ├── style.css            # Component styles + dark mode
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   └── js/
│       ├── app.js           # Main orchestrator
│       ├── api.js           # Backend communication
│       ├── render.js        # DOM rendering
│       ├── storage.js       # LocalStorage persistence
│       ├── draft.js         # Auto-save draft notes
│       ├── reminders.js     # Browser notifications
│       ├── calendar.js      # Due date parsing
│       ├── drag.js          # Task reordering
│       ├── share.js         # URL-based sharing
│       └── voice.js         # Voice input (Web Speech API)
└── package.json
```

## API Reference

### POST /process

Transform notes into an organized to-do list.

**Request:**
```json
{
  "notes": "Meeting at 2pm, finish report by Friday, buy groceries",
  "mode": "default",
  "customPrompt": ""
}
```

**Response:**
```json
{
  "result": "🔴 URGENT (Today)\n  - [8] Attend meeting at 2pm\n\n🟡 THIS WEEK\n  - [7] Finish report → Due: Friday",
  "provider": "groq",
  "mode": "default"
}
```

**Parameters:**
- `notes` (string, required) — Max 2000 characters
- `mode` (string) — One of: `default`, `simple`, `meeting`, `email`
- `customPrompt` (string) — Override default system prompt

**Error Responses:**
- `400` — No notes provided or too long
- `429` — Rate limited (retry after 2+ seconds)
- `500` — AI provider error

## Usage Examples

### Example 1: Work Day (Default mode)
```
Input: "Team standup 9am, review PR for Ali, deploy staging by noon, 
        check emails, 1:1 with manager at 3pm, code review backlog"

Output:
🔴 URGENT (Today)
  - [9] Team standup → Today, 9am
  - [8] Deploy staging → Today, noon
  - [7] 1:1 with manager → Today, 3pm

🟡 THIS WEEK
  - [6] Review PR for Ali
  - [5] Code review backlog

🟢 ANYTIME
  - [3] Check emails
```

### Example 2: Meeting Notes (Meeting mode)
```
Input: "Alice to follow up on the budget, Bob will schedule the Q3 review, 
        I need to send the contracts by Friday"

Output:
📋 ACTION ITEMS

- [8] @alice Follow up on the budget
- [7] @bob Schedule the Q3 review → Due: Friday
- [6] @me Send the contracts → Due: Friday
```

### Example 3: Personal Errands (Simple mode)
```
Input: "Pay electricity bill, call mum on Sunday, renew car insurance this week"

Output:
1. [9] Pay electricity bill
2. [8] Renew car insurance
3. [5] Call mum → Sunday
```

## How It Works

1. **Input** → User pastes messy notes into the textarea
2. **AI Processing** → Backend sends notes + mode-specific system prompt to Groq LLM
3. **Language Detection** → AI automatically detects input language and responds in same language
4. **Parsing** → Output is rendered with priority scores, due dates, and category tags
5. **Persistence** → Tasks are saved to LocalStorage; completion state is tracked
6. **Export** — Users can copy, download as .md, export to .ics calendar, or share via URL

## Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
- **AI:** Groq LLM (llama-3.3-70b-versatile), OpenAI (gpt-4o-mini fallback)
- **Storage:** LocalStorage, Browser Cache
- **APIs:** Web Speech API, Notification API, Web Workers (Service Worker)

## Key Features: Technical Deep Dive

### Dual AI Provider Fallback
The `/process` endpoint tries Groq first, then falls back to OpenAI if:
- Groq returns a 5xx error
- Network error occurs (Groq unreachable)

This ensures high availability and handles rate limiting gracefully.

### Multi-Language Support
System prompt instructs the AI to:
- Detect the user's input language automatically
- Respond in **that same language**
- Always use English day names (Monday, Friday, etc.)
- Format dates in arrow notation: `Task → Day`

### Priority Scoring
Each task includes a priority score (1–10) based on:
- Explicit deadlines ("by Friday" → higher score)
- Urgency words ("urgent", "ASAP" → 9-10)
- Default tasks → 5-6

### Rate Limit Handling
- Backend retries Groq once if 429 (respecting `retry-after` header)
- Frontend debouncing prevents duplicate submissions
- Users see friendly error messages with retry guidance

## Development

### Running Tests
```bash
npm test
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

### Building for Production
```bash
npm run build
```

## Deployment

### Deploy to Vercel
```bash
vercel
```

### Deploy to Heroku
```bash
heroku create
git push heroku main
heroku config:set GROQ_API_KEY=gsk_...
```

### Deploy with Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Limitations

- Notes limited to 2000 characters
- Browser reminders require user permission & active browser tab
- Service Worker may not work on all browsers (progressive enhancement)
- Shared links expire after browser cache clears

## Roadmap

- [ ] Database integration (persistent user accounts)
- [ ] Recurring task templates
- [ ] Slack/Teams integration
- [ ] Mobile app (React Native)
- [ ] Collaborative task sharing
- [ ] Integration with Google Calendar

## License

ISC

## Support

Found a bug? Have a feature request?
- [Open an issue](https://github.com/yourusername/note-to-action-agent/issues)
- Email: your-email@example.com

## Author

**Your Name** — [GitHub](https://github.com/yourusername) · [Twitter](https://twitter.com/yourhandle)

---

**Made with ⚡ by [Your Name]**
