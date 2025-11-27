#!/bin/bash

# NIVO App - Environment Variables Setup Script for Vercel
# This script helps you set environment variables in Vercel CLI

echo "🚀 NIVO App - Vercel Environment Setup"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📝 Please provide your environment variables:"
echo ""

# Supabase URL
read -p "NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL

# Supabase Anon Key
read -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

# OpenRouter API Key
read -p "OPENROUTER_API_KEY: " OPENROUTER_KEY

# Site URL
read -p "NEXT_PUBLIC_SITE_URL (your Vercel domain): " SITE_URL

# AI Model (optional)
read -p "AI_MODEL (press Enter for default: openai/gpt-4o-mini): " AI_MODEL
AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}

echo ""
echo "🔐 Setting environment variables in Vercel..."
echo ""

# Set environment variables for all environments
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development <<< "$SUPABASE_URL"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development <<< "$SUPABASE_ANON_KEY"
vercel env add OPENROUTER_API_KEY production preview development <<< "$OPENROUTER_KEY"
vercel env add NEXT_PUBLIC_SITE_URL production preview development <<< "$SITE_URL"
vercel env add AI_MODEL production preview development <<< "$AI_MODEL"

echo ""
echo "✅ Environment variables have been set!"
echo ""
echo "📋 Next steps:"
echo "1. Run 'vercel --prod' to deploy to production"
echo "2. Update Supabase redirect URLs with your Vercel domain"
echo "3. Test your deployment at: $SITE_URL"
echo ""
