#!/usr/bin/env node
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

// We look for players.csv in the root folder of the project
const csvFilePath = path.join(__dirname, '..', 'players.csv');

if (!fs.existsSync(csvFilePath)) {
  console.error(`Could not find players.csv at ${csvFilePath}. Please download the dataset and place it there!`);
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

const POSITION_MAP = {
  'GK': { code: 'GK', group: 'GK' },
  'RB': { code: 'RB', group: 'DEF' },
  'RWB': { code: 'RB', group: 'DEF' },
  'LB': { code: 'LB', group: 'DEF' },
  'LWB': { code: 'LB', group: 'DEF' },
  'CB': { code: 'CB', group: 'DEF' },
  'RM': { code: 'RM', group: 'MID' },
  'LM': { code: 'LM', group: 'MID' },
  'CM': { code: 'CM', group: 'MID' },
  'CDM': { code: 'CDM', group: 'MID' },
  'CAM': { code: 'CAM', group: 'MID' },
  'RW': { code: 'RW', group: 'FWD' },
  'LW': { code: 'LW', group: 'FWD' },
  'CF': { code: 'CF', group: 'FWD' },
  'ST': { code: 'ST', group: 'FWD' },
};

function normalizePosition(posString) {
  if (!posString) return { code: '??', group: '??' };
  const mainPos = posString.split(',')[0].trim().toUpperCase();
  return POSITION_MAP[mainPos] || { code: mainPos, group: '??' };
}

function getContinent(nation) {
  if (!nation) return null;
  return CONTINENT_MAP[nation] || 'Other';
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function randomColor() {
  const colors = ['#EF0107', '#034694', '#FFFFFF', '#000000', '#FDE100', '#1E3A8A', '#00A651'];
  return Math.floor(Math.random() * colors.length);
}

// EA Sports FC 24 Image URLs use the Futwiz CDN format
function getImageUrl(playerId) {
  if (!playerId) return null;
  return `https://cdn.futwiz.com/assets/img/fc24/faces/${playerId}.png`;
}

async function processBatch(rows, stats) {
  const dedupedRows = [];
  const seen = new Set();
  
  for (const r of rows) {
    const key = `${r.name}|||${r.club}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedRows.push(r);
    }
  }

  const { data, error } = await supabase
    .from('players')
    .upsert(dedupedRows, { onConflict: 'name,club', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('Error inserting batch:', error.message);
  } else {
    stats.inserted += (data || []).length;
    stats.skipped += (dedupedRows.length - (data || []).length);
    console.log(`Progress: Processed batch of ${dedupedRows.length} (Inserted: ${(data||[]).length}, Skipped: ${dedupedRows.length - (data||[]).length})`);
  }
}

async function main() {
  console.log('Clearing old duplicate players from database so we can start completely fresh...');
  // We delete in batches to avoid timeout just in case
  const { error: deleteErr } = await supabase
    .from('players')
    .delete()
    .neq('name', 'dummy_safeguard'); // deletes everything

  if (deleteErr) {
    console.error("Warning: Could not clear database:", deleteErr.message);
  } else {
    console.log("Database cleared successfully!");
  }

  console.log(`Reading CSV from ${csvFilePath}...`);
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  let batch = [];
  const stats = { inserted: 0, skipped: 0, total: 0 };
  const BATCH_SIZE = 500;

  Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    step: function(results) {
      const row = results.data;
      
      // The dataset has MULTIPLE historical years of Ronaldo/Messi (FIFA 15, 16, 17, etc.)
      // We ONLY want the FC 24 version to avoid duplicates across old teams!
      if (row.fifa_version && parseFloat(row.fifa_version) !== 24.0) {
        return; 
      }

      const name = row.short_name || row.Name || row.name;
      const club = row.club_name || row.Club || row.club;
      const league = row.league_name || row.League || row.league || 'Unknown League';
      const nation = row.nationality_name || row.Nationality || row.nationality;
      const posString = row.player_positions || row.Position || row.position;
      const ageStr = row.age || row.Age;
      let age = parseInt(ageStr, 10);
      if (isNaN(age)) age = 25;
      
      const playerId = row.player_id || row.ID || null;
      const photo = getImageUrl(playerId);
      const shirtStr = row.club_jersey_number || row.JerseyNumber || null;
      let shirt = parseInt(shirtStr, 10);
      
      if (!name || !club) return;

      const { code, group } = normalizePosition(posString);
      
      // Optional: Only include players from major leagues to keep game playable, or remove this to have ALL
      const majorLeagues = ['English Premier League', 'Spain Primera Division', 'Italian Serie A', 'German 1. Bundesliga', 'French Ligue 1', 'Saudi Pro League', 'Major League Soccer'];
      // if (!majorLeagues.includes(league)) return;

      batch.push({
        name: name.trim(),
        club: club.trim(),
        league: league.trim(),
        nation: nation ? nation.trim() : null,
        continent: getContinent(nation ? nation.trim() : ''),
        position_code: code,
        position_group: group,
        age: age,
        birth_date: null,
        shirt_number: isNaN(shirt) ? null : shirt,
        avatar_seed: hashSeed(`${name.trim()}-${club.trim()}`),
        club_primary_color: '#333333',
        club_secondary_color: '#FFFFFF',
        active: true,
        image_url: photo
      });
      
      stats.total++;
    }
  });

  console.log(`Found ${batch.length} valid FC 24 players. Uploading in batches...`);
  
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    await processBatch(chunk, stats);
  }

  console.log('\n=== DONE ===');
  console.log(`Total FC 24 players processed: ${stats.total}`);
  console.log(`Successfully saved in Supabase: ${stats.inserted}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
