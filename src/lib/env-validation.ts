// Environment Variables Validation
// This file helps ensure all required environment variables are present

const requiredEnvVars = {
  // Public variables (available in browser)
  public: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ],
  // Private variables (server-side only)
  private: [
    'OPENROUTER_API_KEY',
  ],
  // Optional variables
  optional: [
    'AI_MODEL',
  ],
};

function validateEnvVars() {
  const missing = [];
  const warnings = [];

  // Check required public variables
  requiredEnvVars.public.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check required private variables (server-side only)
  if (typeof window === 'undefined') {
    requiredEnvVars.private.forEach((varName) => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });
  }

  // Check optional variables
  requiredEnvVars.optional.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please check .env.local file or Vercel environment variables.');
    console.error('📖 See DEPLOYMENT_GUIDE.md for instructions.\n');
    
    // Only throw error in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables');
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Optional environment variables not set (using defaults):');
    warnings.forEach((varName) => {
      console.warn(`   - ${varName}`);
    });
  }

  // Success message
  if (missing.length === 0) {
    console.log('✅ All required environment variables are set');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnvVars();
}

export default validateEnvVars;
