#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const coachesCsvPath = path.join(__dirname, '..', 'coaches.csv');
const teamsCsvPath = path.join(__dirname, '..', 'teams.csv');

if (!fs.existsSync(coachesCsvPath)) {
  console.error(`Could not find coaches.csv at ${coachesCsvPath}. Please download the dataset and place it there!`);
  process.exit(1);
}
if (!fs.existsSync(teamsCsvPath)) {
  console.error(`Could not find teams.csv at ${teamsCsvPath}. Please download the dataset and place it there!`);
  process.exit(1);
}

const CONTINENT_MAP = {
  England: 'Europe', Spain: 'Europe', Italy: 'Europe', Germany: 'Europe', France: 'Europe',
  Portugal: 'Europe', Netherlands: 'Europe', Belgium: 'Europe', Croatia: 'Europe', Serbia: 'Europe',
  Poland: 'Europe', Sweden: 'Europe', Norway: 'Europe', Denmark: 'Europe', Switzerland: 'Europe',
  Austria: 'Europe', Turkey: 'Europe', 'USA': 'North America', 'United States': 'North America', Canada: 'North America',
  Mexico: 'North America', Brazil: 'South America', Argentina: 'South America',
  Uruguay: 'South America', Colombia: 'South America', Nigeria: 'Africa', Senegal: 'Africa',
  Ghana: 'Africa', Morocco: 'Africa', Algeria: 'Africa', Egypt: 'Africa', "Cote d'Ivoire": 'Africa', 'Ivory Coast': 'Africa',
  Japan: 'Asia', 'Korea Republic': 'Asia', 'South Korea': 'Asia', Australia: 'Asia', Iran: 'Asia', 'Saudi Arabia': 'Asia',
  Qatar: 'Asia',
};

function getContinent(nation) {
  if (!nation) return null;
  return CONTINENT_MAP[nation] || 'Other';
}

function calculateAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

async function main() {
  // ── Step 1: Build coach_id → { club, league } map from teams.csv ──
  console.log('Reading teams.csv to build coach → team mapping...');
  const teamsContent = fs.readFileSync(teamsCsvPath, 'utf8');
  const coachTeamMap = new Map();

  Papa.parse(teamsContent, {
    header: true,
    skipEmptyLines: true,
    step: function (results) {
      const row = results.data;
      // Only use FC 24 data
      if (row.fifa_version && parseFloat(row.fifa_version) !== 24.0) return;
      const coachId = row.coach_id;
      if (!coachId) return;
      coachTeamMap.set(coachId, {
        club: row.team_name || null,
        league: row.league_name || null,
      });
    },
  });
  console.log(`Built mapping for ${coachTeamMap.size} coaches from teams.csv`);

  // ── Step 2: Parse coaches.csv ──
  console.log(`Reading coaches.csv from ${coachesCsvPath}...`);
  const coachesContent = fs.readFileSync(coachesCsvPath, 'utf8');
  const batch = [];

  Papa.parse(coachesContent, {
    header: true,
    skipEmptyLines: true,
    step: function (results) {
      const row = results.data;
      const name = (row.short_name || '').trim();
      if (!name) return;

      const coachId = row.coach_id || null;
      const teamInfo = coachId ? coachTeamMap.get(coachId) : null;

      const nationality = (row.nationality_name || '').trim() || null;
      const dobStr = row.dob || null;
      const imageUrl = (row.coach_face_url || '').trim() || null;

      if (!teamInfo || !teamInfo.league) return;
      const allowedLeagues = [
        'Premier League', 
        'La Liga', 
        'Serie A', 
        'Bundesliga', 
        'Ligue 1', 
        'Pro League', 
        'Major League Soccer'
      ];
      if (!allowedLeagues.includes(teamInfo.league.trim())) return;
      if (!imageUrl) return;

      batch.push({
        name,
        nationality,
        continent: getContinent(nationality),
        club: teamInfo ? teamInfo.club : null,
        league: teamInfo ? teamInfo.league : null,
        age: calculateAge(dobStr),
        dob: dobStr || null,
        image_url: imageUrl,
        active: true,
      });
    },
  });

  console.log(`Found ${batch.length} coaches. Uploading to Supabase...`);

  // ── Step 3: Clear existing coaches ──
  console.log('Clearing existing coaches from database...');
  const { error: deleteErr } = await supabase
    .from('coaches')
    .delete()
    .neq('name', 'dummy_safeguard'); // deletes everything

  if (deleteErr) {
    console.error('Warning: Could not clear coaches table:', deleteErr.message);
  } else {
    console.log('Coaches table cleared successfully!');
  }

  // ── Step 4: Upload in batches ──
  const BATCH_SIZE = 200;
  const stats = { inserted: 0, skipped: 0 };

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);

    // De-duplicate within this chunk
    const dedupedChunk = [];
    const seen = new Set();
    for (const r of chunk) {
      const key = `${r.name}|||${r.club}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedupedChunk.push(r);
      }
    }

    const { data, error } = await supabase
      .from('coaches')
      .upsert(dedupedChunk, { onConflict: 'name,club', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error(`Error inserting batch at offset ${i}:`, error.message);
    } else {
      const inserted = (data || []).length;
      stats.inserted += inserted;
      stats.skipped += dedupedChunk.length - inserted;
      console.log(
        `Progress: Batch ${Math.floor(i / BATCH_SIZE) + 1} — ${dedupedChunk.length} rows (Inserted: ${inserted}, Skipped: ${dedupedChunk.length - inserted})`
      );
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Total coaches processed: ${batch.length}`);
  console.log(`Successfully saved in Supabase: ${stats.inserted}`);
  console.log(`Skipped (duplicates): ${stats.skipped}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
