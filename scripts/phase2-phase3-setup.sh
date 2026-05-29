#!/bin/bash
# phase2-phase3-setup.sh - Quick setup script for Phase 2 & 3
# This script automates the local development environment setup

set -e

echo "🚀 Note-to-Action-Agent: Phase 2 & 3 Setup"
echo "==========================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if Docker is installed (required for Supabase)
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Supabase local development requires Docker."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    echo ""
    read -p "Continue without Docker support? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Installing dependencies..."
npm install
npm install -D supabase

echo ""
echo "✅ Verifying Supabase CLI..."
npx supabase --version

echo ""
echo "📝 Next steps:"
echo "1. Configure GitHub Secrets:"
echo "   - Go to GitHub repo → Settings → Secrets and Variables → Actions"
echo "   - Add: GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY"
echo ""
echo "2. Start local development:"
echo "   npx supabase start    # Requires Docker running"
echo "   npm run dev           # In another terminal"
echo ""
echo "3. For production deployment:"
echo "   - Read: PHASE2-PHASE3-SETUP.md"
echo "   - Sign up at Railway.app or Render.com"
echo "   - Connect your GitHub repository"
echo ""
echo "4. Deploy:"
echo "   git add ."
echo "   git commit -m 'Phase 2 & 3: CI/CD and database setup'"
echo "   git push origin main"
echo ""
echo "✨ Setup complete! Follow the steps above to continue."
