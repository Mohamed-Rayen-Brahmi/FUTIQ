#!/usr/bin/env node
/**
 * Footdle Trivia Stats sync script.
 *
 * Enriches the `players` table with career stats sourced from the
 * Transfermarkt Datasets project (github.com/dcaribou/transfermarkt-datasets),
 * which is published under CC BY-SA 4.0 and updated weekly.
 *
 * New columns populated:
 *   - nickname            (from players.csv  → name_in_home_country when it differs)
 *   - career_goals        (aggregated from appearances.csv)
 *   - career_assists      (aggregated from appearances.csv)
 *   - first_club          (earliest from_club_name in transfers.csv)
 *   - first_club_joined_date (earliest transfer_date in transfers.csv)
 *   - transfermarkt_id    (stored for future re-syncs)
 *
 * Coverage honest caveats:
 *   - career_goals/assists: only appearances recorded in TM's database (~2000+).
 *   - first_club: first *recorded* transfer, not necessarily the youth academy.
 *   - nickname: only when name_in_home_country materially differs from name.
 *   - Unmatched players are logged but not blocked — partial coverage is fine.
 *
 * USAGE
 *   SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/sync-trivia-stats.mjs
 *
 * Optional flags:
 *   --dry-run   Print matches and stats without writing to Supabase
 *   --limit=N   Only process the first N Supabase players (useful for testing)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See usage comment.');
  process.exit(1);
}

const DRY_RUN  = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT    = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : null;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// Transfermarkt Datasets — official R2 CDN (gzip-compressed CSV)
// See: https://github.com/dcaribou/transfermarkt-datasets
// Files are served as .csv.gz and refreshed weekly.
// ─────────────────────────────────────────────────────────────────────────────
const R2_BASE = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data';
const URLS = {
  players:     `${R2_BASE}/players.csv.gz`,
  appearances: `${R2_BASE}/appearances.csv.gz`,
  transfers:   `${R2_BASE}/transfers.csv.gz`,
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV utilities (no external deps — pure Node.js)
// ─────────────────────────────────────────────────────────────────────────────

import { createGunzip } from 'zlib';
import { Readable } from 'stream';

/** Parse a single CSV line, respecting quoted fields. */
function parseCsvLine(line) {
  const result = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Fetch a gzip-compressed CSV from a URL, decompress it, and return rows as objects. */
async function fetchCsv(url, label) {
  console.log(`  Downloading ${label}…`);
  const res = await fetch(url, { headers: { 'User-Agent': 'FootdleSync/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  // Stream-decompress the gzip response into a string
  const gunzip   = createGunzip();
  const nodeStream = Readable.fromWeb(res.body);
  nodeStream.pipe(gunzip);

  let text = '';
  for await (const chunk of gunzip) {
    text += chunk.toString('utf8');
  }

  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) throw new Error(`Empty CSV: ${url}`);
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 2) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = values[j] ?? '';
    rows.push(obj);
  }
  console.log(`  → ${rows.length.toLocaleString()} rows`);
  return rows;
}


// ─────────────────────────────────────────────────────────────────────────────
// Name normalisation for matching
// ─────────────────────────────────────────────────────────────────────────────
function normaliseName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^a-z0-9 ]/g, ' ')       // keep only letters, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Build TM lookup maps
// ─────────────────────────────────────────────────────────────────────────────

function buildTmPlayersMap(rows) {
  // Returns:  normalisedName → [{player_id, nickname, current_club_name}]
  const map = new Map();
  for (const r of rows) {
    const key = normaliseName(r.name || `${r.first_name} ${r.last_name}`);
    if (!key) continue;

    // "nickname" — use name_in_home_country when it's present AND materially
    // different from the primary name (more than just diacritic differences).
    let nickname = null;
    const homeCountryName = (r.name_in_home_country || '').trim();
    if (homeCountryName && normaliseName(homeCountryName) !== normaliseName(r.name)) {
      nickname = homeCountryName;
    }

    const entry = {
      player_id:         r.player_id,
      nickname,
      current_club_name: r.current_club_name || '',
    };

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(entry);
  }
  return map;
}

function buildAppearanceAggregates(rows) {
  // Returns: player_id → {goals, assists}
  const agg = new Map();
  for (const r of rows) {
    const pid = r.player_id;
    if (!pid) continue;
    const goals   = parseInt(r.goals,   10) || 0;
    const assists = parseInt(r.assists, 10) || 0;
    if (!agg.has(pid)) {
      agg.set(pid, { goals: 0, assists: 0 });
    }
    const cur = agg.get(pid);
    cur.goals   += goals;
    cur.assists += assists;
  }
  return agg;
}

function buildFirstClubMap(rows) {
  // Returns: player_id → {first_club, first_date}
  // Keeps only the earliest transfer_date per player_id.
  const map = new Map();
  for (const r of rows) {
    const pid  = r.player_id;
    const date = r.transfer_date ? r.transfer_date.trim() : '';
    const club = (r.from_club_name || '').trim();
    if (!pid || !date || !club || club === 'unknown' || club === 'Without Club') continue;
    const existing = map.get(pid);
    if (!existing || date < existing.first_date) {
      map.set(pid, { first_club: club, first_date: date });
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Matching: Supabase player → TM player
// ─────────────────────────────────────────────────────────────────────────────

function matchPlayer(supabasePlayer, tmPlayersMap) {
  const normName = normaliseName(supabasePlayer.name);
  const candidates = tmPlayersMap.get(normName);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple TM players share the same normalised name — disambiguate by club.
  const normClub = normaliseName(supabasePlayer.club || '');
  const clubMatch = candidates.find(c => normaliseName(c.current_club_name) === normClub);
  if (clubMatch) return clubMatch;

  // Fall back to first candidate but flag it.
  return { ...candidates[0], _ambiguous: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Footdle Trivia Stats Sync ===');
  if (DRY_RUN) console.log('  [DRY RUN — no writes to Supabase]');

  // 1. Fetch Transfermarkt Datasets
  console.log('\n[1/4] Fetching Transfermarkt Datasets CSVs...');
  let tmPlayers, tmAppearances, tmTransfers;
  try {
    [tmPlayers, tmAppearances, tmTransfers] = await Promise.all([
      fetchCsv(URLS.players,     'players.csv'),
      fetchCsv(URLS.appearances, 'appearances.csv'),
      fetchCsv(URLS.transfers,   'transfers.csv'),
    ]);
  } catch (err) {
    console.error(`\nFailed to fetch Transfermarkt CSVs: ${err.message}`);
    console.error('Check that the URLs in URLS object are correct and that the repo is accessible.');
    process.exit(1);
  }

  console.log('\n[2/4] Building lookup maps...');
  const tmPlayersMap  = buildTmPlayersMap(tmPlayers);
  const aggMap        = buildAppearanceAggregates(tmAppearances);
  const firstClubMap  = buildFirstClubMap(tmTransfers);
  console.log(`  ${tmPlayersMap.size.toLocaleString()} unique normalised player names`);
  console.log(`  ${aggMap.size.toLocaleString()} players with appearance data`);
  console.log(`  ${firstClubMap.size.toLocaleString()} players with transfer history`);

  // 2. Fetch all Supabase players
  console.log('\n[3/4] Fetching players from Supabase...');
  let query = supabase.from('players').select('id,name,club,transfermarkt_id');
  if (LIMIT) query = query.limit(LIMIT);
  const { data: sbPlayers, error: sbErr } = await query;
  if (sbErr) {
    console.error('Supabase fetch error:', sbErr.message);
    process.exit(1);
  }
  console.log(`  ${sbPlayers.length.toLocaleString()} players in Supabase`);

  // 3. Match and update
  console.log('\n[4/4] Matching and updating...');
  const stats = {
    matched: 0,
    unmatched: 0,
    ambiguous: 0,
    updated: 0,
    skipped_already_enriched: 0,
    errors: [],
  };

  const BATCH = 50; // rows per upsert batch
  const updates = [];

  for (const sp of sbPlayers) {
    // Prefer matching via stored transfermarkt_id if available
    let tmEntry = null;
    if (sp.transfermarkt_id) {
      const candidates = [...tmPlayersMap.values()].flat();
      tmEntry = candidates.find(c => c.player_id === sp.transfermarkt_id) || null;
    }
    if (!tmEntry) {
      tmEntry = matchPlayer(sp, tmPlayersMap);
    }

    if (!tmEntry) {
      stats.unmatched++;
      if (stats.unmatched <= 20) {
        console.log(`  [unmatched] ${sp.name} (${sp.club})`);
      }
      continue;
    }

    if (tmEntry._ambiguous) {
      stats.ambiguous++;
      console.log(`  [ambiguous] ${sp.name} (${sp.club}) — used first TM candidate`);
    }

    stats.matched++;
    const pid = tmEntry.player_id;
    const agg = aggMap.get(pid) || null;
    const fc  = firstClubMap.get(pid) || null;

    const update = {
      id: sp.id,
      transfermarkt_id: pid,
      nickname:               tmEntry.nickname     || null,
      career_goals:           agg  ? agg.goals    : null,
      career_assists:         agg  ? agg.assists  : null,
      first_club:             fc   ? fc.first_club  : null,
      first_club_joined_date: fc   ? fc.first_date  : null,
    };
    updates.push(update);
  }

  if (stats.unmatched > 20) {
    console.log(`  ... and ${stats.unmatched - 20} more unmatched players.`);
  }

  console.log(`\n  Matched: ${stats.matched}  |  Unmatched: ${stats.unmatched}  |  Ambiguous: ${stats.ambiguous}`);

  if (!DRY_RUN && updates.length > 0) {
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH);
      const promises = batch.map(u => {
        // remove id from payload to avoid updating primary key
        const { id, ...payload } = u;
        return supabase.from('players').update(payload).eq('id', id);
      });
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error.message);
      
      if (errors.length > 0) {
        stats.errors.push(...errors);
        console.log(`\n  ! Batch error: ${errors[0]}`);
      } else {
        stats.updated += batch.length;
        process.stdout.write(`\r  Updated ${stats.updated}/${updates.length} players...`);
      }
    }
    console.log();
  } else if (DRY_RUN) {
    console.log('  [DRY RUN] Would update', updates.length, 'players.');
    // Show a sample
    for (const u of updates.slice(0, 5)) {
      const sp = sbPlayers.find(p => p.id === u.id);
      console.log(`  Sample: ${sp?.name} → goals=${u.career_goals}, assists=${u.career_assists}, first_club=${u.first_club}, nickname=${u.nickname}`);
    }
  }

  // Coverage report
  const withGoals      = updates.filter(u => u.career_goals   != null).length;
  const withAssists    = updates.filter(u => u.career_assists  != null).length;
  const withFirstClub  = updates.filter(u => u.first_club      != null).length;
  const withNickname   = updates.filter(u => u.nickname        != null).length;
  const total          = sbPlayers.length;

  console.log('\n=== Coverage Report ===');
  console.log(`  career_goals:           ${withGoals}/${total} (${pct(withGoals, total)}%)`);
  console.log(`  career_assists:         ${withAssists}/${total} (${pct(withAssists, total)}%)`);
  console.log(`  first_club:             ${withFirstClub}/${total} (${pct(withFirstClub, total)}%)`);
  console.log(`  nickname:               ${withNickname}/${total} (${pct(withNickname, total)}%)`);
  console.log(`  errors:                 ${stats.errors.length}`);
  if (stats.errors.length) {
    stats.errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
  }
  console.log('\n=== DONE ===');
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
