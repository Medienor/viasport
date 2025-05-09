import { createClient } from '@supabase/supabase-js';

// Supabase setup using Next.js environment variables
// Ensure these are defined in your .env.local or environment configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY; // Use the ANON key

if (!supabaseUrl) {
  throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  // Remember to use the ANON key for client-side code.
  // Service role key should only be used securely on the server (e.g., API routes).
  throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_KEY (should be ANON key)");
}

// Create Supabase client for client-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// If you need a separate client instance for server-side operations
// using the service role key (e.g., in API routes or server components
// where you are SURE it won't leak to the client), you could potentially
// create another client like this, but be very careful where you use it:
/*
import { createServerClient } from '@supabase/ssr'; // Or appropriate server helper
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // No NEXT_PUBLIC_ prefix

export const getSupabaseServiceRoleClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key for server client");
  }
  // Use appropriate server-side client creation method depending on your setup
  // This is just a placeholder example:
  // return createClient(supabaseUrl, supabaseServiceRoleKey);
};
*/ 