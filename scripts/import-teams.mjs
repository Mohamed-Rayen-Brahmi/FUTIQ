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

const teamsCsvPath = path.join(__dirname, '..', 'teams.csv');

if (!fs.existsSync(teamsCsvPath)) {
  console.error(`Could not find teams.csv at ${teamsCsvPath}. Please download the dataset and place it there!`);
  process.exit(1);
}

async function main() {
  console.log(`Reading teams.csv from ${teamsCsvPath}...`);
  const fileContent = fs.readFileSync(teamsCsvPath, 'utf8');
  const batch = [];

  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    step: function (results) {
      const row = results.data;

      // Only FC 24 data
      if (row.fifa_version && parseFloat(row.fifa_version) !== 24.0) return;

      const name = (row.team_name || '').trim();
      if (!name) return;

      const leagueName = (row.league_name || '').trim();

      const allowedLeagues = [
        'Premier League', 
        'La Liga', 
        'Serie A', 
        'Bundesliga', 
        'Ligue 1', 
        'Pro League', 
        'Major League Soccer'
      ];
      if (!allowedLeagues.includes(leagueName)) return;

      const teamId = (row.team_id || '').trim();

      batch.push({
        name,
        league: leagueName || null,
        country: (row.nationality_name || '').trim() || null,
        overall: parseInt(row.overall, 10) || null,
        attack: parseInt(row.attack, 10) || null,
        midfield: parseInt(row.midfield, 10) || null,
        defence: parseInt(row.defence, 10) || null,
        stadium: (row.home_stadium || '').trim() || null,
        def_style: (row.def_style || '').trim() || null,
        off_style: (row.off_style || '').trim() || null,
        image_url: teamId ? `https://cdn.futwiz.com/assets/img/fc24/badges/${teamId}.png` : null,
        active: true,
      });
    },
  });

  console.log(`Found ${batch.length} FC 24 teams. Uploading to Supabase...`);

  // ── Clear existing teams ──
  console.log('Clearing existing teams from database...');
  const { error: deleteErr } = await supabase
    .from('teams')
    .delete()
    .neq('name', 'dummy_safeguard'); // deletes everything

  if (deleteErr) {
    console.error('Warning: Could not clear teams table:', deleteErr.message);
  } else {
    console.log('Teams table cleared successfully!');
  }

  // ── Upload in batches ──
  const BATCH_SIZE = 200;
  const stats = { inserted: 0, skipped: 0 };

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);

    // De-duplicate within this chunk
    const dedupedChunk = [];
    const seen = new Set();
    for (const r of chunk) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        dedupedChunk.push(r);
      }
    }

    const { data, error } = await supabase
      .from('teams')
      .upsert(dedupedChunk, { onConflict: 'name', ignoreDuplicates: true })
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
  console.log(`Total FC 24 teams processed: ${batch.length}`);
  console.log(`Successfully saved in Supabase: ${stats.inserted}`);
  console.log(`Skipped (duplicates): ${stats.skipped}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
