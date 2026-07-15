import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Panel, StatPill, EmptyState, Spinner } from '../components/ui';
import type { GameHistory } from '../types/database';

export function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setHistoryLoading(true);
      const { data } = await supabase
        .from('game_history')
        .select('*, players(name, club, league)')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
      setHistoryLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-4xl text-gold" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl text-gold mb-6">
        {profile?.username || user.email?.split('@')[0]}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatPill label="Streak" value={profile?.streak ?? 0} />
        <StatPill label="Max Streak" value={profile?.max_streak ?? 0} />
        <StatPill label="Played" value={profile?.games_played ?? 0} />
        <StatPill label="Won" value={profile?.games_won ?? 0} />
      </div>

      {/* Recent games */}
      <h2 className="font-display text-2xl text-slate-300 mb-4">Recent Games</h2>
      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="text-2xl text-gold" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState message="No games played yet" sub="Play a round to see your history here" />
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((game) => (
            <Panel key={game.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-body text-slate-200">{game.players?.name || 'Unknown player'}</p>
                <p className="font-label text-xs uppercase text-slate-500">
                  {game.players?.club} · {game.players?.league}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-label text-sm text-slate-400">
                  {game.guesses_used} guesses
                </span>
                <span className={`font-display text-lg ${game.won ? 'text-match-green' : 'text-cta'}`}>
                  {game.won ? 'WON' : 'LOST'}
                </span>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
