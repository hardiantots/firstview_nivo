#!/bin/bash

# NIVO App - Pre-Deployment Checklist Script
# Run this before deploying to ensure everything is ready

echo "🚀 NIVO App - Pre-Deployment Checklist"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

# Function to check
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((checks_passed++))
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        ((checks_failed++))
        return 1
    fi
}

# Check 1: .env.local exists
echo "📋 Checking environment files..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local exists${NC}"
    ((checks_passed++))
else
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "   Create it from .env.example"
    ((checks_failed++))
fi

# Check 2: .env.local not in git
echo ""
echo "🔒 Checking Git status..."
if git check-ignore .env.local > /dev/null 2>&1; then
    echo -e "${GREEN}✅ .env.local is in .gitignore${NC}"
    ((checks_passed++))
else
    echo -e "${RED}❌ .env.local might be tracked by Git!${NC}"
    echo "   Make sure it's in .gitignore"
    ((checks_failed++))
fi

# Check 3: No uncommitted secrets
if git status --porcelain | grep -q ".env"; then
    echo -e "${RED}❌ .env files detected in git status${NC}"
    echo "   Do NOT commit .env files!"
    ((checks_failed++))
else
    echo -e "${GREEN}✅ No .env files in git staging${NC}"
    ((checks_passed++))
fi

# Check 4: Environment variables validation
echo ""
echo "🔍 Checking environment variables..."
node scripts/check-env.js
check "Environment variables"

# Check 5: TypeScript compilation
echo ""
echo "📝 Checking TypeScript..."
npm run type-check > /dev/null 2>&1
check "TypeScript compilation"

# Check 6: Linting
echo ""
echo "🧹 Running linter..."
npm run lint > /dev/null 2>&1
check "ESLint"

# Check 7: Build test
echo ""
echo "🏗️  Testing production build..."
npm run build > /dev/null 2>&1
check "Production build"

# Summary
echo ""
echo "======================================"
echo "📊 Summary:"
echo "   Passed: $checks_passed"
echo "   Failed: $checks_failed"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub: git push origin main"
    echo "2. Or deploy directly: npm run deploy:prod"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please fix them before deploying.${NC}"
    echo ""
    echo "See:"
    echo "- DEPLOYMENT_GUIDE.md for deployment instructions"
    echo "- SECURITY.md for security best practices"
    echo ""
    exit 1
fi
