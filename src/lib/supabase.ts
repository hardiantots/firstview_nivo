import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL. Please add it to your .env.local file. ' +
    'See SUPABASE_SETUP_GUIDE.md for instructions.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Please add it to your .env.local file. ' +
    'See SUPABASE_SETUP_GUIDE.md for instructions.'
  );
}

// Create Supabase client with session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    flowType: 'implicit', // Use implicit flow for OAuth compatibility
    debug: process.env.NODE_ENV === 'development', // Enable debug in dev
  },
});
