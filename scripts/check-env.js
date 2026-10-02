#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Run this before deploying to ensure all required variables are set
 */

const requiredEnvVars = {
  public: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ],
  private: [
    'SUPABASE_SERVICE_ROLE_KEY',
  ],
  optional: [
  ],
};

console.log('🔍 Checking environment variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required public variables
console.log('📌 Public Variables (NEXT_PUBLIC_*):');
requiredEnvVars.public.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}`);
  } else {
    console.log(`   ❌ ${varName} - MISSING`);
    hasErrors = true;
  }
});

// Check required private variables
console.log('\n🔐 Private Variables (server-side only):');
requiredEnvVars.private.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}`);
  } else {
    console.log(`   ❌ ${varName} - MISSING`);
    hasErrors = true;
  }
});

// Check optional variables
console.log('\n⚙️  Optional Variables:');
requiredEnvVars.optional.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName} = ${process.env[varName]}`);
  } else {
    console.log(`   ⚠️  ${varName} - Not set (using default)`);
    hasWarnings = true;
  }
});

// Summary
console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ FAILED: Missing required environment variables');
  console.log('\n📝 To fix:');
  console.log('   1. Copy .env.example to .env.local');
  console.log('   2. Fill in your actual values');
  console.log('   3. For Vercel deployment, set them in Vercel dashboard');
  console.log('\n📖 See DEPLOYMENT_GUIDE.md for detailed instructions\n');
  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: All required environment variables are set');
  
  if (hasWarnings) {
    console.log('\n⚠️  Some optional variables are not set, but that\'s okay');
    console.log('   The app will use default values\n');
  } else {
    console.log('   Your environment is fully configured!\n');
  }
  
  process.exit(0);
}
