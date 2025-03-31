import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables from .env.local in the project root (EXACTLY like fetchAllTeams.js)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

// Try to load from .env.local first, then fall back to .env (EXACTLY like fetchAllTeams.js)
let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

// Supabase setup (EXACTLY like fetchAllTeams.js)
const supabaseUrl = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Try a simple query to test the connection
    const { data, error } = await supabase
      .from('leagues')  // Using leagues table since we know it exists from fetchAllTeams.js
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }

    console.log('✅ Connection successful!');
    console.log('Data received:', data);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testConnection(); 