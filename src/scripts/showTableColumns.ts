import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';

// Load environment variables from .env.local in the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

let envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(rootDir, '.env');
}
dotenv.config({ path: envPath });

const supabaseUrl = 'https://cdynfbwdwdfsiwkgixua.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetch as any
  }
});

async function showTableStructure() {
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Fixtures table columns:');
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data found in fixtures table');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

showTableStructure(); 