#!/usr/bin/env node
/**
 * Standalone Footdle player sync script.
 *
 * Run this on your own machine (not as a Supabase Edge Function) so there's
 * no execution-time limit — it just runs until every league is done, however
 * long that takes.
 *
 * IMPORTANT — image source: this pulls player photos directly from
 * TheSportsDB's own squad data (strCutout / strThumb / strRender), the same
 * call already used for roster data — not Wikidata. That means every photo
 * is a guaranteed correct match (it's literally the same record, no separate
 * name-search step that can mismatch), and it's much faster since there's no
 * second API to call per player.
 *
 * The honest tradeoff: TheSportsDB's images are crowd-sourced/fan-uploaded,
 * not clearly licensed for reuse the way Wikimedia Commons content is. That's
 * the same legal exposure flagged earlier for a monetized/public launch —
 * this script doesn't change that risk, it just gets you working images for
 * now. Keep the illustrated SVG system as the fallback either way.
 *
 * USAGE
 *   1. npm install   (from the project root, if you haven't already)
 *   2. Get your Supabase service-role key: Supabase dashboard → Project
 *      Settings → API → service_role key. NEVER commit this or put it in
 *      client-side code — it bypasses RLS entirely.
 *   3. Run:
 *        SUPABASE_URL="https://<your-project>.supabase.co" \
 *        SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
 *        node scripts/sync-players.mjs
 *
 *      Optional: sync just one league:
 *        node scripts/sync-players.mjs --league="Saudi-Arabian_Pro_League"
 *
 * This is idempotent — safe to re-run any time to pick up new players or
 * refresh rosters. It never overwrites an image_url that's already set
 * (so any photo you've manually edited in via the DB stays untouched).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. See the usage comment at the top of this file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SPORTSDB_KEY = '3';
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;

const LEAGUES = [
  { name: 'English_Premier_League', label: 'Premier League' },
  { name: 'Spanish_La_Liga', label: 'La Liga' },
  { name: 'Italian_Serie_A', label: 'Serie A' },
  { name: 'German_Bundesliga', label: 'Bundesliga' },
  { name: 'French_Ligue_1', label: 'Ligue 1' },
  { name: 'American_Major_League_Soccer', label: 'MLS' },
  { name: 'Saudi-Arabian_Pro_League', label: 'Saudi Pro League' },
];

const CLUB_COLORS = {
  'Arsenal': { primary: '#EF0107', secondary: '#FFFFFF' },
  'Manchester United': { primary: '#DA291C', secondary: '#FBE122' },
  'Liverpool': { primary: '#C8102E', secondary: '#00B2A9' },
  'Chelsea': { primary: '#034694', secondary: '#FFFFFF' },
  'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
  'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
  'Real Madrid': { primary: '#FFFFFF', secondary: '#FEBE10' },
  'Barcelona': { primary: '#A50044', secondary: '#004D98' },
  'Atletico Madrid': { primary: '#CB3524', secondary: '#262E62' },
  'Juventus': { primary: '#000000', secondary: '#FFFFFF' },
  'AC Milan': { primary: '#FB090B', secondary: '#000000' },
  'Inter Milan': { primary: '#0068A8', secondary: '#000000' },
  'Bayern Munich': { primary: '#DC052D', secondary: '#FFFFFF' },
  'Borussia Dortmund': { primary: '#FDE100', secondary: '#000000' },
  'PSG': { primary: '#004170', secondary: '#DA291C' },
  'Marseille': { primary: '#2FAEE0', secondary: '#FFFFFF' },
  'LA Galaxy': { primary: '#00245D', secondary: '#FECF09' },
  'Inter Miami': { primary: '#F7B5CD', secondary: '#000000' },
  'Al Nassr': { primary: '#FFD700', secondary: '#000080' },
  'Al Hilal': { primary: '#1E3A8A', secondary: '#FFFFFF' },
  'Al Ahli': { primary: '#00A651', secondary: '#FFFFFF' },
};

const CONTINENT_MAP = {
  England: 'Europe', Spain: 'Europe', Italy: 'Europe', Germany: 'Europe', France: 'Europe',
  Portugal: 'Europe', Netherlands: 'Europe', Belgium: 'Europe', Croatia: 'Europe', Serbia: 'Europe',
  Poland: 'Europe', Sweden: 'Europe', Norway: 'Europe', Denmark: 'Europe', Switzerland: 'Europe',
  Austria: 'Europe', Turkey: 'Europe', 'USA': 'North America', Canada: 'North America',
  Mexico: 'North America', Brazil: 'South America', Argentina: 'South America',
  Uruguay: 'South America', Colombia: 'South America', Nigeria: 'Africa', Senegal: 'Africa',
  Ghana: 'Africa', Morocco: 'Africa', Algeria: 'Africa', Egypt: 'Africa', 'Ivory Coast': 'Africa',
  Japan: 'Asia', 'South Korea': 'Asia', Australia: 'Asia', Iran: 'Asia', 'Saudi Arabia': 'Asia',
  Qatar: 'Asia',
};

const POSITION_MAP = {
  'Goalkeeper': { code: 'GK', group: 'GK' },
  'Right-Back': { code: 'RB', group: 'DEF' },
  'Left-Back': { code: 'LB', group: 'DEF' },
  'Centre-Back': { code: 'CB', group: 'DEF' },
  'Defender': { code: 'DF', group: 'DEF' },
  'Right Midfielder': { code: 'RM', group: 'MID' },
  'Left Midfielder': { code: 'LM', group: 'MID' },
  'Central Midfielder': { code: 'CM', group: 'MID' },
  'Defensive Midfielder': { code: 'CDM', group: 'MID' },
  'Attacking Midfielder': { code: 'CAM', group: 'MID' },
  'Midfielder': { code: 'MF', group: 'MID' },
  'Right Winger': { code: 'RW', group: 'FWD' },
  'Left Winger': { code: 'LW', group: 'FWD' },
  'Second Striker': { code: 'CF', group: 'FWD' },
  'Centre-Forward': { code: 'ST', group: 'FWD' },
  'Striker': { code: 'ST', group: 'FWD' },
  'Forward': { code: 'FW', group: 'FWD' },
  'Winger': { code: 'WF', group: 'FWD' },
};

function normalizePosition(pos) {
  if (!pos) return { code: '??', group: '??' };
  if (POSITION_MAP[pos.trim()]) return POSITION_MAP[pos.trim()];
  const lower = pos.toLowerCase();
  if (lower.includes('goalkeeper')) return { code: 'GK', group: 'GK' };
  if (lower.includes('back') || lower.includes('defend')) return { code: 'DF', group: 'DEF' };
  if (lower.includes('wing')) return { code: 'WF', group: 'FWD' };
  if (lower.includes('striker') || lower.includes('forward')) return { code: 'ST', group: 'FWD' };
  if (lower.includes('midfield')) return { code: 'MF', group: 'MID' };
  return { code: '??', group: '??' };
}

function computeAge(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 100 ? age : null;
}

function getContinent(nation) {
  if (!nation) return null;
  return CONTINENT_MAP[nation] || null;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'FootdleSync/1.0' } });
      if (res.status === 429) {
        // Rate limited — back off much longer than a normal error, and
        // respect Retry-After if TheSportsDB sends one.
        const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
        const waitMs = !Number.isNaN(retryAfter) ? retryAfter * 1000 : 5000 * (attempt + 1);
        console.log(`  (rate limited, waiting ${Math.round(waitMs / 1000)}s...)`);
        await delay(waitMs);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await delay(1000 * (attempt + 1));
    }
  }
  throw new Error('Exceeded retries');
}

// TheSportsDB provides these directly on each squad member — no separate
// lookup needed, which is what makes this both faster and a guaranteed
// correct match compared to a name-search-based approach.
function pickPhoto(p) {
  return p.strCutout || p.strRender || p.strThumb || null;
}

async function syncLeague(league, totals) {
  console.log(`\n=== ${league.label} ===`);
  const teamsData = await fetchJson(`${SPORTSDB_BASE}/search_all_teams.php?l=${encodeURIComponent(league.name)}`);
  const teams = teamsData?.teams || [];
  console.log(`  ${teams.length} teams found`);

  for (const team of teams) {
    const teamId = team.idTeam;
    const teamName = team.strTeam || '';
    const leagueName = team.strLeague || league.label;

    try {
      const rosterData = await fetchJson(`${SPORTSDB_BASE}/lookup_all_players.php?id=${teamId}`);
      const players = rosterData?.player || [];
      if (players.length === 0) {
        totals.teams_processed++;
        await delay(600);
        continue;
      }

      const clubColor = CLUB_COLORS[teamName] || { primary: '#333333', secondary: '#999999' };
      const rows = [];

      for (const p of players) {
        const name = p.strPlayer || '';
        if (!name) continue;
        const nation = p.strNationality || null;
        const { code, group } = normalizePosition(p.strPosition);
        const birthDate = p.dateBorn || null;
        const shirt = p.strNumber ? parseInt(p.strNumber, 10) : null;
        const photo = pickPhoto(p);

        rows.push({
          name,
          nation,
          continent: getContinent(nation),
          club: teamName,
          league: leagueName,
          position_code: code,
          position_group: group,
          age: computeAge(birthDate),
          birth_date: birthDate,
          shirt_number: Number.isNaN(shirt) ? null : shirt,
          avatar_seed: hashSeed(`${name}-${teamName}`),
          club_primary_color: clubColor.primary,
          club_secondary_color: clubColor.secondary,
          active: true,
          // Only stamp a photo here if we found one — upsert below still
          // respects "never overwrite an existing image_url" via a
          // follow-up conditional update, not this initial upsert.
        });
      }

      if (rows.length === 0) {
        totals.teams_processed++;
        await delay(600);
        continue;
      }

      // Some squads have duplicate entries (same name+club appearing twice —
      // e.g. reserve/youth listings), which makes Postgres reject the whole
      // batch with "ON CONFLICT DO UPDATE command cannot affect row a second
      // time" since it can't apply two updates to the same conflict target
      // in one statement. Dedupe by name+club, keeping the first occurrence.
      const seen = new Set();
      const dedupedRows = [];
      for (const row of rows) {
        const key = `${row.name}|||${row.club}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedRows.push(row);
      }
      if (dedupedRows.length < rows.length) {
        console.log(`  (deduped ${rows.length - dedupedRows.length} duplicate entr${rows.length - dedupedRows.length === 1 ? 'y' : 'ies'} in ${teamName})`);
      }

      const { data: upserted, error } = await supabase
        .from('players')
        .upsert(dedupedRows, { onConflict: 'name,club', ignoreDuplicates: false })
        .select('id,name,image_url');

      if (error) {
        totals.errors.push(`${teamName}: ${error.message}`);
        console.log(`  ! ${teamName}: ${error.message}`);
      } else {
        totals.players_upserted += upserted.length;

        // Now fill in the photo, but only where image_url is still null —
        // this preserves any photo you've manually set via the DB.
        for (const row of upserted) {
          const original = rows.find((r) => r.name === row.name);
          const photo = original ? pickPhoto(players.find((p) => p.strPlayer === row.name) || {}) : null;
          if (!photo || row.image_url) continue;
          const { error: photoErr } = await supabase
            .from('players')
            .update({ image_url: photo, image_attribution: 'Photo via TheSportsDB' })
            .eq('id', row.id)
            .is('image_url', null);
          if (!photoErr) totals.photos_matched++;
        }

        console.log(`  ${teamName}: ${upserted.length} players`);
      }
    } catch (err) {
      totals.errors.push(`${teamName}: ${err.message}`);
      console.log(`  ! ${teamName}: ${err.message}`);
    }

    totals.teams_processed++;
    await delay(600); // gentle on TheSportsDB's free-tier rate limit
  }
}

async function main() {
  const leagueArg = process.argv.find((a) => a.startsWith('--league='));
  const singleLeague = leagueArg ? leagueArg.split('=')[1] : null;

  const leaguesToProcess = singleLeague
    ? LEAGUES.filter((l) => l.name.toLowerCase().includes(singleLeague.toLowerCase()) || l.label.toLowerCase().includes(singleLeague.toLowerCase()))
    : LEAGUES;

  if (leaguesToProcess.length === 0) {
    console.error(`No league matched "${singleLeague}". Valid names: ${LEAGUES.map((l) => l.name).join(', ')}`);
    process.exit(1);
  }

  const totals = { leagues_processed: 0, teams_processed: 0, players_upserted: 0, photos_matched: 0, errors: [] };

  for (const league of leaguesToProcess) {
    try {
      await syncLeague(league, totals);
      totals.leagues_processed++;
    } catch (err) {
      console.error(`League ${league.label} failed, moving to next: ${err.message}`);
      totals.errors.push(`League ${league.label}: ${err.message}`);
    }
  }

  console.log('\n=== DONE ===');
  console.log(JSON.stringify(totals, null, 2));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
