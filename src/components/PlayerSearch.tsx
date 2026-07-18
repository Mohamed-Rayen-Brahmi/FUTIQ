import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Player } from '../types/database';
import { Spinner } from './ui';

interface PlayerSearchProps {
  onGuess: (player: Player) => void;
  disabled: boolean;
  guessedNames: Set<string>;
  rpcName?: string;
}

export function PlayerSearch({ onGuess, disabled, guessedNames, rpcName = 'search_players' }: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .rpc(rpcName as any, { search_query: query.trim() });

        if (error) throw error;
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((player: Player) => {
    onGuess(player);
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [onGuess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      const first = results.find(r => !guessedNames.has(r.name.toLowerCase())) || results[0];
      if (first) handleSelect(first);
    }
  }, [results, guessedNames, handleSelect]);

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a player name..."
          className="w-full bg-ink-deep border border-ink-border rounded-lg px-4 py-3 font-body text-slate-200 placeholder-slate-600 focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gold">
            <Spinner />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-ink-panel border border-ink-border rounded-lg overflow-hidden shadow-xl max-h-72 overflow-y-auto">
          {results.map((player) => {
            const alreadyGuessed = guessedNames.has(player.name.toLowerCase());
            return (
              <button
                key={player.id}
                onClick={() => !alreadyGuessed && handleSelect(player)}
                disabled={alreadyGuessed}
                className={`w-full text-left px-4 py-2.5 border-b border-ink-border last:border-b-0 transition-colors ${
                  alreadyGuessed
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-ink-deep cursor-pointer'
                }`}
              >
                <div className="font-body text-slate-200">{player.name}</div>
                <div className="font-label text-xs text-slate-500 uppercase tracking-wide">
                  {player.club} · {player.nation} · {player.position_code}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-ink-panel border border-ink-border rounded-lg px-4 py-3 text-slate-500 text-sm">
          No players found
        </div>
      )}
    </div>
  );
}
