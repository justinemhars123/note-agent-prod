# Deployment Guide

This guide covers deployment options for the Note-to-Action Agent application.

## Prerequisites

- Node.js 16+ installed
- Valid API keys:
  - **Groq** (required): https://console.groq.com/keys
  - **OpenAI** (optional): https://platform.openai.com/account/api-keys
- Git repository set up

---

## 1. Docker Deployment (Recommended)

### Local Development with Docker

```bash
# Build image
docker build -t note-to-action-agent:latest .

# Run container
docker run -p 3001:3001 \
  -e GROQ_API_KEY=your_groq_key \
  -e OPENAI_API_KEY=your_openai_key \
  note-to-action-agent:latest
```

### Using Docker Compose

```bash
# Development mode
docker-compose up

# Production mode
docker-compose --profile production up
```

**Environment variables** (create `.env` file):
```env
NODE_ENV=production
PORT=3001
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
```

### Push to Docker Hub

```bash
# Tag image
docker tag note-to-action-agent:latest username/note-to-action-agent:latest

# Push
docker push username/note-to-action-agent:latest

# Pull and run anywhere
docker pull username/note-to-action-agent:latest
docker run -p 3001:3001 -e GROQ_API_KEY=xxx username/note-to-action-agent:latest
```

---

## 2. Vercel Deployment

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fnote-to-action-agent)

Or manual setup:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Configuration for Vercel

Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/process",
      "dest": "server.js",
      "methods": ["POST"]
    },
    {
      "src": "/(.*)",
      "dest": "public/$1"
    }
  ]
}
```

### Add Environment Variables

In Vercel dashboard:
1. Go to Project → Settings → Environment Variables
2. Add:
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`

---

## 3. Heroku Deployment

### Quick Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/yourusername/note-to-action-agent)

### Manual Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set GROQ_API_KEY=your_key
heroku config:set OPENAI_API_KEY=your_key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Create `Procfile`

```
web: node server.js
```

---

## 4. AWS EC2 Deployment

### Setup Ubuntu Server

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/yourusername/note-to-action-agent.git
cd note-to-action-agent

# Install dependencies
npm install

# Create .env file
nano .env
# (Add your API keys)

# Install PM2 for process management
sudo npm install -g pm2

# Start app with PM2
pm2 start server.js --name "note-agent"
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/default
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable and restart Nginx
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 5. DigitalOcean App Platform

### Deploy via Web Interface

1. Connect your GitHub repository
2. Create new App
3. Set runtime to Node.js
4. Add environment variables in settings
5. Deploy

### Deploy via CLI

```bash
# Install doctl
# (https://docs.digitalocean.com/reference/doctl/how-to/install/)

# Login
doctl auth init

# Deploy
doctl apps create --spec app.yaml
```

---

## 6. Railway.app Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set GROQ_API_KEY=your_key

# Deploy
railway up
```

---

## 7. Render.com Deployment

1. Push code to GitHub
2. Connect GitHub to Render
3. Create new Web Service
4. Select your repository
5. Set environment variables
6. Deploy

---

## 8. Self-Hosted (Linux Server)

### Using systemd service

Create `/etc/systemd/system/note-agent.service`:
```ini
[Unit]
Description=Note-to-Action Agent
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/ubuntu/note-to-action-agent
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="GROQ_API_KEY=your_key"
Environment="OPENAI_API_KEY=your_key"

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable note-agent
sudo systemctl start note-agent
sudo systemctl status note-agent
```

---

## Performance Optimization

### For Production

1. **Use a CDN** for static assets (CloudFront, Cloudflare)
2. **Enable gzip compression** in Express
3. **Set proper cache headers** for static files
4. **Use a reverse proxy** (Nginx, Cloudflare)
5. **Monitor with** Sentry, DataDog, or New Relic

### Recommended Configuration

```javascript
// In server.js
app.use(express.static('public', {
    maxAge: '1h',
    etag: false
}));

app.use(compression());
```

---

## Monitoring & Logging

### Health Checks

All deployments include a `/health` endpoint (via Docker HEALTHCHECK):
```bash
curl http://localhost:3001
```

### Logging

- **Development**: Logs to console
- **Production**: Log to file or service (Sentry, LogRocket, etc.)

### Error Tracking

```javascript
// Add to server.js for production
if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    app.use(Sentry.Handlers.errorHandler());
}
```

---

## Scaling

### Horizontal Scaling
- Use load balancer (AWS ELB, Heroku Dyno scaling)
- Deploy multiple instances behind reverse proxy
- Use caching layer (Redis)

### Vertical Scaling
- Upgrade server resources
- Optimize code and database queries
- Use clustering (Node.js cluster module)

---

## Security Checklist

- ✅ Environment variables for secrets (no hardcoded keys)
- ✅ HTTPS/TLS enabled (automatically on Vercel, Heroku, Render)
- ✅ CORS configured for allowed origins
- ✅ Rate limiting enabled
- ✅ Input validation & sanitization
- ✅ Security headers set (HSTS, X-Frame-Options, etc.)
- ✅ Regular dependency updates
- ✅ API keys rotated regularly

---

## Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env
PORT=3002
```

### Memory Issues
```bash
# Increase Node.js heap size
NODE_OPTIONS=--max-old-space-size=2048 node server.js
```

### API Key Errors
```bash
# Verify in container
docker exec container-name env | grep API
```

### Build Failures
```bash
# Check logs
npm run lint
npm test
```

---

## Support

- Issues: https://github.com/yourusername/note-to-action-agent/issues
- Discussions: https://github.com/yourusername/note-to-action-agent/discussions

---

Last updated: May 29, 2026
