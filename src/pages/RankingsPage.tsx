import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { RankingRow } from '../types/database';
import { SkewButton, Panel, Spinner } from '../components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export function RankingsPage() {
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase
          .rpc('get_rankings', { p_mode: 'all' });
        if (rpcError) throw rpcError;
        if (!cancelled) setRankings(data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rankings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Title */}
      <h1 className="font-display text-4xl text-gold text-center mb-8 tracking-wide">
        Global Leaderboard
      </h1>

      {/* Content */}
      <Panel className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-6 h-6" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 font-body">
            {error}
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-body">
            No rankings available yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-border">
                <th className="px-4 py-3 font-label text-xs uppercase tracking-wider text-slate-500 text-left w-16">
                  Rank
                </th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-wider text-slate-500 text-left">
                  Username
                </th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-wider text-slate-500 text-center w-28">
                  Total Score
                </th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-wider text-slate-500 text-center w-24">
                  Wins
                </th>
                <th className="px-4 py-3 font-label text-xs uppercase tracking-wider text-slate-500 text-center w-28">
                  Best Streak
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row) => (
                <tr
                  key={row.user_id}
                  className="border-b border-ink-border/50 last:border-b-0 hover:bg-ink-deep/50 transition-colors"
                >
                  <td className="px-4 py-3 font-label text-sm text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      {row.rank <= 3 ? (
                        <span className="text-lg">{MEDALS[row.rank - 1]}</span>
                      ) : (
                        <span className="text-slate-500">{row.rank}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-slate-200">
                    {row.username || 'Anonymous'}
                  </td>
                  <td className="px-4 py-3 font-display text-lg text-gold text-center font-bold">
                    {row.total_score}
                  </td>
                  <td className="px-4 py-3 font-display text-lg text-slate-300 text-center">
                    {row.wins}
                  </td>
                  <td className="px-4 py-3 font-display text-lg text-match-green text-center">
                    {row.best_streak}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
