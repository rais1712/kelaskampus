// server/lib/supabase.ts
// ✅ Server-side Supabase client with service role key

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and ' +
    'SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env'
  );
}

console.log('🔗 Supabase Server Client initialized');
console.log('   URL:', supabaseUrl);
console.log('   Key type:', supabaseKey.includes('service_role') ? 'SERVICE_ROLE' : 'ANON');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
