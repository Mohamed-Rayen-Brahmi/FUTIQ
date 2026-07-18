import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSQL() {
  console.log('Fetching 500 players from database...');
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, nation, club, league, position_code, age, shirt_number, continent')
    .eq('active', true)
    .limit(500);

  if (error) {
    console.error('Error fetching players:', error);
    process.exit(1);
  }

  if (!players || players.length === 0) {
    console.error('No players found in database');
    process.exit(1);
  }

  console.log(`Generating SQL for ${players.length} players...`);
  
  let sql = `-- Seed file for who_am_i mode\n`;
  sql += `-- Generated automatically\n\n`;

  players.forEach((p) => {
    const pName = p.name.replace(/'/g, "''");
    
    // Generate hints
    const hint1 = `I am a professional footballer from ${p.continent || 'around the world'}.`;
    const hint2 = p.age ? `I am currently ${p.age} years old.` : `I have been playing at the highest level for years.`;
    const hint3 = p.shirt_number ? `I wear the number ${p.shirt_number} shirt.` : `I am known for my distinctive playing style.`;
    const hint4 = p.position_code ? `My primary position is ${p.position_code}.` : `I am a versatile player.`;
    const hint5 = p.league ? `I play my club football in the ${p.league}.` : `I play in one of the top leagues.`;
    const hint6 = p.nation ? `I represent ${p.nation} at the international level.` : `I have represented my country globally.`;
    const hint7 = p.club ? `I am currently signed to ${p.club}.` : `I play for a very famous club.`;
    
    const initials = p.name.split(' ').map(n => n[0]).join('. ') + '.';
    const hint8 = `My name initials are ${initials}`;

    sql += `
INSERT INTO who_am_i (player_id, hint1, hint2, hint3, hint4, hint5, hint6, hint7, hint8)
VALUES (
  '${p.id}',
  '${hint1.replace(/'/g, "''")}',
  '${hint2.replace(/'/g, "''")}',
  '${hint3.replace(/'/g, "''")}',
  '${hint4.replace(/'/g, "''")}',
  '${hint5.replace(/'/g, "''")}',
  '${hint6.replace(/'/g, "''")}',
  '${hint7.replace(/'/g, "''")}',
  '${hint8.replace(/'/g, "''")}'
) ON CONFLICT (player_id) DO NOTHING;
`;
  });

  fs.writeFileSync('supabase/migrations/20260718000001_seed_who_am_i.sql', sql);
  console.log('Successfully wrote 20260718000001_seed_who_am_i.sql');
}

generateSQL();
