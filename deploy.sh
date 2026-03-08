#!/bin/bash
# MTS Angola - Deploy Script for Railway

echo "🚢 MTS Angola Multi-Agent System - Deploy Preparation"
echo "======================================================"

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    echo "📦 Committing changes..."
    git add .
    git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "📤 Pushing to GitHub..."
    git push origin main
else
    echo "⚠️  No remote configured!"
    echo ""
    echo "To complete setup:"
    echo "1. Create a repository on GitHub"
    echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/mts-angola.git"
    echo "3. Run: git push -u origin main"
    echo "4. Go to railway.app and deploy from GitHub"
fi

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "📖 Next steps:"
echo "1. Create account on railway.app"
echo "2. Deploy from GitHub repository"
echo "3. Add environment variables (see .env.example)"
echo "4. Add persistent volume at /app/data"
echo ""
