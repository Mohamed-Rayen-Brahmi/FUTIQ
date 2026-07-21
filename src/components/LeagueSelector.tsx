import { Trophy, Globe } from 'lucide-react';
import { SkewButton } from './ui';

export type SupportedLeague = 
  | 'Premier League' 
  | 'La Liga' 
  | 'Serie A' 
  | 'Bundesliga' 
  | 'Ligue 1' 
  | 'Saudi Pro League' 
  | 'Major League Soccer'
  | 'Global';

interface LeagueSelectorProps {
  modeLabel: string;
  onSelectLeague: (league: SupportedLeague) => void;
  onBack: () => void;
}

const LEAGUES: { name: SupportedLeague; label: string; icon: string; color: string }[] = [
  { name: 'Premier League', label: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: 'from-[#38003c] to-[#e90052]' },
  { name: 'La Liga', label: 'La Liga', icon: '🇪🇸', color: 'from-[#ee8707] to-[#f6b211]' },
  { name: 'Serie A', label: 'Serie A', icon: '🇮🇹', color: 'from-[#002f6c] to-[#0068a8]' },
  { name: 'Bundesliga', label: 'Bundesliga', icon: '🇩🇪', color: 'from-[#d11019] to-[#ffffff]' },
  { name: 'Ligue 1', label: 'Ligue 1', icon: '🇫🇷', color: 'from-[#dae025] to-[#121c29]' },
  { name: 'Saudi Pro League', label: 'Saudi Pro League', icon: '🇸🇦', color: 'from-[#1a4a38] to-[#18754b]' },
  { name: 'Major League Soccer', label: 'MLS', icon: '🇺🇸', color: 'from-[#002b5e] to-[#e31837]' }
];

export function LeagueSelector({ modeLabel, onSelectLeague, onBack }: LeagueSelectorProps) {
  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in pb-10">
      <div className="text-center mb-8">
        <h2 className="font-display text-4xl text-slate-100 mb-3 flex items-center justify-center gap-3">
          <Trophy className="text-gold" size={32} />
          {modeLabel} Mode
        </h2>
        <p className="font-body text-slate-400 text-lg">
          Select a league to play. You will only guess from the top starting players in that specific league.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {LEAGUES.map((league) => (
          <button
            key={league.name}
            onClick={() => onSelectLeague(league.name)}
            className="relative overflow-hidden rounded-xl border border-ink-border group text-left hover:scale-[1.02] transition-transform duration-200"
          >
            <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${league.color} group-hover:opacity-40 transition-opacity`} />
            <div className="relative p-6 flex items-center justify-between bg-ink-deep/50 backdrop-blur-sm">
              <div>
                <div className="font-display text-2xl text-slate-100 mb-1">{league.label}</div>
                <div className="font-label text-xs text-slate-400 uppercase tracking-wide">
                  Top Players Only
                </div>
              </div>
              <div className="text-4xl drop-shadow-lg filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                {league.icon}
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={() => onSelectLeague('Global')}
          className="relative overflow-hidden rounded-xl border border-gold/30 group text-left hover:scale-[1.02] transition-transform duration-200 sm:col-span-2"
        >
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-gold to-cta group-hover:opacity-20 transition-opacity" />
          <div className="relative p-6 flex items-center justify-between bg-ink-deep/50 backdrop-blur-sm">
            <div>
              <div className="font-display text-2xl text-gold mb-1">Global Mode</div>
              <div className="font-label text-xs text-slate-400 uppercase tracking-wide">
                All Leagues, All Players
              </div>
            </div>
            <Globe className="text-gold opacity-50 group-hover:opacity-100 transition-all" size={40} />
          </div>
        </button>
      </div>

      <div className="text-center">
        <SkewButton variant="ghost" onClick={onBack}>
          ← Back to Modes
        </SkewButton>
      </div>
    </div>
  );
}
