import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SPORTSDB_KEY = "3";
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIDATA_ENTITY = "https://www.wikidata.org/wiki/Special:EntityData";
const COMMONS_FILE_PATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";
const FOOTBALLER_QID = "Q937857";

// 7 leagues with TheSportsDB league name slugs
const LEAGUES: { name: string; label: string; country: string }[] = [
  { name: "English_Premier_League", label: "Premier League", country: "England" },
  { name: "Spanish_La_Liga", label: "La Liga", country: "Spain" },
  { name: "Italian_Serie_A", label: "Serie A", country: "Italy" },
  { name: "German_Bundesliga", label: "Bundesliga", country: "Germany" },
  { name: "French_Ligue_1", label: "Ligue 1", country: "France" },
  { name: "American_Major_League_Soccer", label: "MLS", country: "USA" },
  { name: "Saudi-Arabian_Pro_League", label: "Saudi Pro League", country: "Saudi Arabia" },
];

// Club color table for major clubs (hex without #)
const CLUB_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Arsenal": { primary: "#EF0107", secondary: "#FFFFFF" },
  "Manchester United": { primary: "#DA291C", secondary: "#FBE122" },
  "Liverpool": { primary: "#C8102E", secondary: "#00B2A9" },
  "Chelsea": { primary: "#034694", secondary: "#FFFFFF" },
  "Manchester City": { primary: "#6CABDD", secondary: "#1C2C5B" },
  "Tottenham Hotspur": { primary: "#132257", secondary: "#FFFFFF" },
  "Real Madrid": { primary: "#FFFFFF", secondary: "#FEBE10" },
  "Barcelona": { primary: "#A50044", secondary: "#004D98" },
  "Atletico Madrid": { primary: "#CB3524", secondary: "#262E62" },
  "Juventus": { primary: "#000000", secondary: "#FFFFFF" },
  "AC Milan": { primary: "#FB090B", secondary: "#000000" },
  "Inter Milan": { primary: "#0068A8", secondary: "#000000" },
  "Bayern Munich": { primary: "#DC052D", secondary: "#FFFFFF" },
  "Borussia Dortmund": { primary: "#FDE100", secondary: "#000000" },
  "PSG": { primary: "#004170", secondary: "#DA291C" },
  "Marseille": { primary: "#2FAEE0", secondary: "#FFFFFF" },
  "LA Galaxy": { primary: "#00245D", secondary: "#FECF09" },
  "Inter Miami": { primary: "#F7B5CD", secondary: "#000000" },
  "Al Nassr": { primary: "#FFD700", secondary: "#000080" },
  "Al Hilal": { primary: "#1E3A8A", secondary: "#FFFFFF" },
  "Al Ahli": { primary: "#00A651", secondary: "#FFFFFF" },
  "Newcastle United": { primary: "#241F20", secondary: "#FFFFFF" },
  "Aston Villa": { primary: "#95BFE5", secondary: "#670E36" },
  "West Ham United": { primary: "#7A2636", secondary: "#1BB1E7" },
  "Brighton": { primary: "#0057B8", secondary: "#FFCD00" },
  "Wolverhampton": { primary: "#FDB913", secondary: "#231F20" },
  "Sevilla": { primary: "#FFFFFF", secondary: "#D5122E" },
  "Valencia": { primary: "#FFFFFF", secondary: "#000000" },
  "Napoli": { primary: "#12A0DA", secondary: "#FFFFFF" },
  "Roma": { primary: "#8E1F2F", secondary: "#F0BC42" },
  "Lazio": { primary: "#87D8F7", secondary: "#FFFFFF" },
  "RB Leipzig": { primary: "#DD0741", secondary: "#001F47" },
  "Lyon": { primary: "#FFFFFF", secondary: "#1A2D5A" },
  "Monaco": { primary: "#E30613", secondary: "#FFFFFF" },
};

const CONTINENT_MAP: Record<string, string> = {
  "England": "Europe", "Spain": "Europe", "Italy": "Europe", "Germany": "Europe",
  "France": "Europe", "Portugal": "Europe", "Netherlands": "Europe", "Belgium": "Europe",
  "Croatia": "Europe", "Serbia": "Europe", "Poland": "Europe", "Sweden": "Europe",
  "Norway": "Europe", "Denmark": "Europe", "Finland": "Europe", "Ireland": "Europe",
  "Wales": "Europe", "Scotland": "Europe", "Northern Ireland": "Europe", "Switzerland": "Europe",
  "Austria": "Europe", "Czech Republic": "Europe", "Slovakia": "Europe", "Hungary": "Europe",
  "Greece": "Europe", "Turkey": "Europe", "Russia": "Europe", "Ukraine": "Europe",
  "Romania": "Europe", "Bulgaria": "Europe", "Iceland": "Europe", "Albania": "Europe",
  "Bosnia and Herzegovina": "Europe", "Slovenia": "Europe", "Montenegro": "Europe",
  "North Macedonia": "Europe", "Kosovo": "Europe", "Georgia": "Europe", "Armenia": "Europe",
  "Azerbaijan": "Europe", "Israel": "Asia",
  "USA": "North America", "Canada": "North America", "Mexico": "North America",
  "Costa Rica": "North America", "Jamaica": "North America", "Panama": "North America",
  "Honduras": "North America", "El Salvador": "North America", "Guatemala": "North America",
  "Trinidad and Tobago": "North America", "Curaçao": "North America", "Bermuda": "North America",
  "Brazil": "South America", "Argentina": "South America", "Colombia": "South America",
  "Uruguay": "South America", "Chile": "South America", "Peru": "South America",
  "Ecuador": "South America", "Paraguay": "South America", "Bolivia": "South America",
  "Venezuela": "South America", "Guyana": "South America", "Suriname": "South America",
  "Nigeria": "Africa", "Senegal": "Africa", "Ghana": "Africa", "Cameroon": "Africa",
  "Ivory Coast": "Africa", "Morocco": "Africa", "Algeria": "Africa", "Tunisia": "Africa",
  "Egypt": "Africa", "South Africa": "Africa", "Kenya": "Africa", "Mali": "Africa",
  "Guinea": "Africa", "Zimbabwe": "Africa", "DR Congo": "Africa", "Congo": "Africa",
  "Gabon": "Africa", "Togo": "Africa", "Burkina Faso": "Africa", "Niger": "Africa",
  "Sierra Leone": "Africa", "Liberia": "Africa", "Mozambique": "Africa", "Angola": "Africa",
  "Cape Verde": "Africa", "Madagascar": "Africa", "Comoros": "Africa", "Gambia": "Africa",
  "Mauritania": "Africa", "Central African Republic": "Africa", "Chad": "Africa",
  "Sudan": "Africa", "South Sudan": "Africa", "Uganda": "Africa", "Tanzania": "Africa",
  "Zambia": "Africa", "Namibia": "Africa", "Botswana": "Africa", "Lesotho": "Africa",
  "Eswatini": "Africa", "Malawi": "Africa", "Rwanda": "Africa", "Burundi": "Africa",
  "Benin": "Africa", "Equatorial Guinea": "Africa", "São Tomé and Príncipe": "Africa",
  "Japan": "Asia", "South Korea": "Asia", "China PR": "Asia", "Australia": "Asia",
  "Iran": "Asia", "Saudi Arabia": "Asia", "Qatar": "Asia", "Iraq": "Asia",
  "Uzbekistan": "Asia", "United Arab Emirates": "Asia", "Syria": "Asia",
  "Thailand": "Asia", "Vietnam": "Asia", "Indonesia": "Asia", "Malaysia": "Asia",
  "Philippines": "Asia", "Singapore": "Asia", "India": "Asia", "Pakistan": "Asia",
  "Bangladesh": "Asia", "Kazakhstan": "Asia", "Kyrgyzstan": "Asia",
  "Tajikistan": "Asia", "Turkmenistan": "Asia", "Mongolia": "Asia",
  "Lebanon": "Asia", "Jordan": "Asia", "Palestine": "Asia", "Kuwait": "Asia",
  "Bahrain": "Asia", "Oman": "Asia", "Yemen": "Asia", "Afghanistan": "Asia",
  "Nepal": "Asia", "Sri Lanka": "Asia", "Myanmar": "Asia", "Cambodia": "Asia",
  "Laos": "Asia", "Brunei": "Asia", "Timor-Leste": "Asia",
  "New Zealand": "Oceania", "Fiji": "Oceania", "Papua New Guinea": "Oceania",
  "Solomon Islands": "Oceania", "Vanuatu": "Oceania", "Samoa": "Oceania",
  "Tonga": "Oceania", "Cook Islands": "Oceania", "Tahiti": "Oceania",
};

// Position normalization
const POSITION_MAP: Record<string, { code: string; group: string }> = {
  "Goalkeeper": { code: "GK", group: "GK" },
  "Right-Back": { code: "RB", group: "DEF" },
  "Left-Back": { code: "LB", group: "DEF" },
  "Centre-Back": { code: "CB", group: "DEF" },
  "Defender": { code: "DF", group: "DEF" },
  "Right Midfielder": { code: "RM", group: "MID" },
  "Left Midfielder": { code: "LM", group: "MID" },
  "Central Midfielder": { code: "CM", group: "MID" },
  "Defensive Midfielder": { code: "CDM", group: "MID" },
  "Attacking Midfielder": { code: "CAM", group: "MID" },
  "Midfielder": { code: "MF", group: "MID" },
  "Right Winger": { code: "RW", group: "FWD" },
  "Left Winger": { code: "LW", group: "FWD" },
  "Second Striker": { code: "CF", group: "FWD" },
  "Centre-Forward": { code: "ST", group: "FWD" },
  "Striker": { code: "ST", group: "FWD" },
  "Forward": { code: "FW", group: "FWD" },
  "Winger": { code: "WF", group: "FWD" },
};

function normalizePosition(pos: string | null | undefined): { code: string; group: string } {
  if (!pos) return { code: "??", group: "??" };
  const key = pos.trim();
  if (POSITION_MAP[key]) return POSITION_MAP[key];
  const lower = key.toLowerCase();
  if (lower.includes("goalkeeper") || lower === "gk") return { code: "GK", group: "GK" };
  if (lower.includes("back") || lower.includes("defend")) return { code: "DF", group: "DEF" };
  if (lower.includes("wing") && (lower.includes("forward") || lower.includes("attack"))) return { code: "WF", group: "FWD" };
  if (lower.includes("wing")) return { code: "WF", group: "FWD" };
  if (lower.includes("striker") || lower.includes("forward")) return { code: "ST", group: "FWD" };
  if (lower.includes("midfield")) return { code: "MF", group: "MID" };
  return { code: "??", group: "??" };
}

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 100 ? age : null;
}

function getContinent(nation: string | null | undefined): string | null {
  if (!nation) return null;
  if (CONTINENT_MAP[nation]) return CONTINENT_MAP[nation];
  // Try partial match
  for (const key of Object.keys(CONTINENT_MAP)) {
    if (nation.includes(key) || key.includes(nation)) return CONTINENT_MAP[key];
  }
  return null;
}

function hashSeed(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FootdleSync/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await delay(1000 * (attempt + 1));
    }
  }
  throw new Error("unreachable");
}

async function lookupWikidataPhoto(name: string): Promise<{ url: string | null; attribution: string | null }> {
  try {
    // Step 1: Search Wikidata for candidate entities matching the player name
    const searchUrl = `${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&format=json&limit=3`;
    const searchData = await fetchJson(searchUrl, 1);

    const candidates = searchData?.search;
    if (!Array.isArray(candidates) || candidates.length === 0) return { url: null, attribution: null };

    // Step 2: Check top 3 candidates for occupation = association football player (Q937857)
    let matchedEntity: { id: string; label?: string } | null = null;
    for (const candidate of candidates.slice(0, 3)) {
      const qid = candidate.id;
      if (!qid || !qid.startsWith("Q")) continue;

      await delay(200);
      const entityUrl = `${WIKIDATA_ENTITY}/${qid}.json`;
      const entityData = await fetchJson(entityUrl, 1);

      const entity = entityData?.entities?.[qid];
      const claims = entity?.claims;
      if (!claims) continue;

      const occupationClaims = claims["P106"];
      if (!Array.isArray(occupationClaims)) continue;

      const isFootballer = occupationClaims.some((c: any) => c?.mainsnak?.datavalue?.value?.id === FOOTBALLER_QID);
      if (isFootballer) {
        matchedEntity = { id: qid, label: candidate.label };
        break;
      }
    }

    if (!matchedEntity) return { url: null, attribution: null };

    // Step 3: Fetch image (P18) and license (P275) from the confirmed entity
    await delay(200);
    const entityUrl = `${WIKIDATA_ENTITY}/${matchedEntity.id}.json`;
    const entityData = await fetchJson(entityUrl, 1);

    const entity = entityData?.entities?.[matchedEntity.id];
    const claims = entity?.claims;
    if (!claims) return { url: null, attribution: null };

    const imageClaim = claims["P18"];
    if (!Array.isArray(imageClaim) || imageClaim.length === 0) return { url: null, attribution: null };

    const imageValue = imageClaim[0]?.mainsnak?.datavalue?.value;
    if (!imageValue) return { url: null, attribution: null };

    // P18 value is the Commons file name (e.g. "Cristiano Ronaldo 2018.jpg")
    const fileName = typeof imageValue === "string" ? imageValue : (imageValue as any).text || "";
    if (!fileName) return { url: null, attribution: null };

    const imageUrl = `${COMMONS_FILE_PATH}${encodeURIComponent(fileName)}`;

    // License attribution
    let attribution = "Wikimedia Commons";
    const licenseClaim = claims["P275"];
    if (Array.isArray(licenseClaim) && licenseClaim.length > 0) {
      const licenseQid = licenseClaim[0]?.mainsnak?.datavalue?.value?.id;
      if (licenseQid) {
        await delay(200);
        try {
          const licenseEntityUrl = `${WIKIDATA_ENTITY}/${licenseQid}.json`;
          const licenseData = await fetchJson(licenseEntityUrl, 1);
          const licenseEntity = licenseData?.entities?.[licenseQid];
          const enLabel = licenseEntity?.labels?.en?.value;
          if (enLabel) attribution = enLabel;
        } catch { /* keep default */ }
      }
    }

    return { url: imageUrl, attribution };
  } catch {
    return { url: null, attribution: null };
  }
}

// Processes a small, bounded batch of players still missing a photo.
// Safe to call repeatedly — each call picks up wherever the last one left
// off (ordered by id), and never re-processes a player that already has an
// image_url. This is what makes the photo sync resumable: instead of one
// invocation trying (and failing) to cover the whole roster, you call this
// endpoint in a loop until `remaining_without_photo` hits 0.
async function handlePhotoBatch(supabase: any, batchSize: number) {
  const { data: players, error } = await supabase
    .from("players")
    .select("id,name")
    .is("image_url", null)
    .eq("active", true)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (error) {
    return { error: error.message };
  }

  let matched = 0;
  const errors: string[] = [];

  for (const player of players || []) {
    try {
      const { url: photoUrl, attribution } = await lookupWikidataPhoto(player.name);
      if (photoUrl) {
        const { error: photoErr } = await supabase
          .from("players")
          .update({ image_url: photoUrl, image_attribution: attribution })
          .eq("id", player.id)
          .is("image_url", null); // never overwrite a value set since we read it
        if (!photoErr) matched++;
        else errors.push(`Player ${player.id}: ${photoErr.message}`);
      }
      await delay(200); // gentle on Wikidata
    } catch (err) {
      errors.push(`Player ${player.id} (${player.name}): ${err.message}`);
    }
  }

  const { count: remaining } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .is("image_url", null)
    .eq("active", true);

  return {
    processed: (players || []).length,
    matched,
    remaining_without_photo: remaining ?? null,
    done: (players || []).length === 0,
    errors,
  };
}

async function handleStatus(supabase: any) {
  const { count: total } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true });

  const { count: withPhoto } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .not("image_url", "is", null);

  const { count: withoutPhoto } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .is("image_url", null);

  return {
    total_players: total ?? 0,
    with_photo: withPhoto ?? 0,
    without_photo: withoutPhoto ?? 0,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Supabase invokes Edge Functions for any request carrying a valid JWT
    // in the Authorization header by default — and the public anon key
    // (shipped in the frontend bundle, visible to literally anyone) counts
    // as a valid JWT. Without this extra check, anyone could trigger a full
    // 7-league sync repeatedly, running up function-invocation usage and
    // hammering TheSportsDB from this project's IP. This is an admin-only
    // maintenance endpoint, not something the game itself ever calls, so it
    // requires a separate shared secret only the developer knows.
    //
    // Set it once via: supabase secrets set SYNC_ADMIN_SECRET=<a long random value>
    // Then call this function with header: x-sync-secret: <that same value>
    const requiredSecret = Deno.env.get("SYNC_ADMIN_SECRET");
    const providedSecret = req.headers.get("x-sync-secret");
    if (!requiredSecret || providedSecret !== requiredSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "roster";
    const singleLeague = url.searchParams.get("league");

    // Shared client setup for every mode
    const supabaseUrlEarly = Deno.env.get("SUPABASE_URL")!;
    const serviceKeyEarly = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseEarly = createClient(supabaseUrlEarly, serviceKeyEarly, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // mode=status — quick counts, no writes, always fast
    if (mode === "status") {
      const result = await handleStatus(supabaseEarly);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // mode=photos — process one small resumable batch of Wikidata photo
    // lookups. Call this repeatedly (e.g. in a loop, or click the button
    // again) until `remaining_without_photo` reaches 0.
    if (mode === "photos") {
      const batchSize = Math.min(
        Math.max(parseInt(url.searchParams.get("batch_size") || "25", 10) || 25, 1),
        100,
      );
      const result = await handlePhotoBatch(supabaseEarly, batchSize);
      return new Response(
        JSON.stringify({ success: !result.error, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // mode=roster (default) — existing team/squad sync from TheSportsDB,
    // no Wikidata calls in this path anymore (see note above the loop).

    // Select leagues to process
    let leaguesToProcess = LEAGUES;
    if (singleLeague) {
      leaguesToProcess = LEAGUES.filter((l) =>
        l.name.toLowerCase().includes(singleLeague.toLowerCase()) ||
        l.label.toLowerCase().includes(singleLeague.toLowerCase())
      );
      if (leaguesToProcess.length === 0) {
        return new Response(
          JSON.stringify({ error: `Unknown league: ${singleLeague}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const supabase = supabaseEarly;

    const totals = {
      leagues_processed: 0,
      teams_processed: 0,
      players_upserted: 0,
      photos_matched: 0,
      errors: [] as string[],
    };

    for (const league of leaguesToProcess) {
      try {
        // Fetch all teams in the league
        const teamsUrl = `${SPORTSDB_BASE}/search_all_teams.php?l=${encodeURIComponent(league.name)}`;
        const teamsData = await fetchJson(teamsUrl);
        const teams = teamsData?.teams || [];

        for (const team of teams) {
          try {
            const teamId = team.idTeam;
            const teamName = team.strTeam || "";
            const teamShort = team.strTeamShort || team.strTeam || "";
            const leagueName = team.strLeague || league.label;

            // Fetch full squad
            const rosterUrl = `${SPORTSDB_BASE}/lookup_all_players.php?id=${teamId}`;
            const rosterData = await fetchJson(rosterUrl);
            const players = rosterData?.player || [];

            if (players.length === 0) {
              totals.teams_processed++;
              await delay(300);
              continue;
            }

            const clubColor = CLUB_COLORS[teamName] || { primary: "#333333", secondary: "#999999" };

            // Batch upsert players for this team
            const rows: any[] = [];
            for (const p of players) {
              const name = p.strPlayer || "";
              if (!name) continue;

              const nation = p.strNationality || null;
              const continent = getContinent(nation);
              const { code, group } = normalizePosition(p.strPosition);
              const birthDate = p.dateBorn || null;
              const age = computeAge(birthDate);
              const shirt = p.strNumber ? parseInt(p.strNumber, 10) : null;
              const avatarSeed = hashSeed(`${name}-${teamName}`);

              rows.push({
                name,
                nation,
                continent,
                club: teamName,
                league: leagueName,
                position_code: code,
                position_group: group,
                age: age !== null ? age : null,
                birth_date: birthDate,
                shirt_number: isNaN(shirt as number) ? null : shirt,
                avatar_seed: avatarSeed,
                club_primary_color: clubColor.primary,
                club_secondary_color: clubColor.secondary,
                active: true,
              });
            }

            if (rows.length > 0) {
              // Upsert by name + club (unique enough for roster sync)
              const { data: upserted, error } = await supabase
                .from("players")
                .upsert(rows, {
                  onConflict: "name,club",
                  ignoreDuplicates: false,
                })
                .select("id,name,image_url");

              if (error) {
                totals.errors.push(`Team ${teamName}: ${error.message}`);
              } else if (upserted) {
                totals.players_upserted += upserted.length;
                // NOTE: photo lookup is intentionally NOT done here anymore.
                // Combining full roster sync with per-player Wikidata calls
                // (each player needs up to 5 sequential Wikidata HTTP calls)
                // pushed single invocations past the edge function execution
                // time limit, so most players in a league were never reached.
                // Photos are now synced separately via mode=photos, in small
                // resumable batches. See handlePhotoBatch() below.
              }
            }

            totals.teams_processed++;
            await delay(300); // gentle on TheSportsDB
          } catch (err) {
            totals.errors.push(`Team ${team?.idTeam || "unknown"}: ${err.message}`);
            continue;
          }
        }

        totals.leagues_processed++;
      } catch (err) {
        totals.errors.push(`League ${league.name}: ${err.message}`);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ success: true, totals }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
