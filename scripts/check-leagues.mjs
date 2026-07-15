import fs from 'fs';
import Papa from 'papaparse';

const file = fs.readFileSync('players.csv', 'utf8');
const parsed = Papa.parse(file, { header: true });

const leagues = {};
const levels = {};

for (const row of parsed.data) {
  if (row.league_name) {
    leagues[row.league_name] = (leagues[row.league_name] || 0) + 1;
    if (row.league_level) {
      levels[row.league_name] = row.league_level;
    }
  }
}

const sorted = Object.entries(leagues).sort((a, b) => b[1] - a[1]);
console.log('Total Leagues:', sorted.length);
console.log('\nTop 20 Leagues (with Division Level):');
sorted.slice(0, 20).forEach(([league, count]) => {
  console.log(`- ${league} (Div ${levels[league]}): ${count} players`);
});

console.log('\nChecking for specific leagues:');
const targetLeagues = sorted.filter(x => 
  x[0].toLowerCase().includes('saudi') || 
  x[0].toLowerCase().includes('major league soccer') ||
  x[0].toLowerCase().includes('mls') ||
  x[0].toLowerCase().includes('premier league') ||
  x[0].toLowerCase().includes('la liga') ||
  x[0].toLowerCase().includes('serie a') ||
  x[0].toLowerCase().includes('bundesliga') ||
  x[0].toLowerCase().includes('ligue 1')
);
targetLeagues.forEach(([league, count]) => {
  console.log(`- ${league} (Div ${levels[league]}): ${count} players`);
});
