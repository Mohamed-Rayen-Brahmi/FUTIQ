import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data, error } = await supabase.rpc('get_rankings', { p_mode: 'daily' });
  console.log('Daily:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('game_history').select('*');
  console.log('History:', d2?.length, 'rows');
  if (d2) console.log(d2.slice(-5));
}

main();
