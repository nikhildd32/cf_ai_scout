#!/bin/bash
# Fix Cloudflare Vite plugin nested output structure
# The plugin builds to public/client/ but Wrangler expects files in public/

echo "🔧 Fixing build output structure..."

if [ -d "public/client" ]; then
    echo "📁 Moving files from public/client/ to public/..."
    
    # Remove any existing conflicting files
    rm -rf public/index.html public/my_chat_agent
    
    # Move all files from client to public root
    mv public/client/* public/
    
    # Remove empty client directory
    rmdir public/client
    
    echo "✅ Build output structure fixed!"
    echo ""
    echo "Current public/ structure:"
    ls -la public/
else
    echo "ℹ️  No nested client/ directory found - structure is correct"
fi

