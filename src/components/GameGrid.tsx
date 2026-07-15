import type { GuessRow, CellStatus } from '../types/database';

import { ArrowUp, ArrowDown } from 'lucide-react';

interface GameGridProps {
  guesses: GuessRow[];
  maxGuesses: number | null; // null = Unlimited mode, no guess cap
}

const STATUS_COLORS: Record<CellStatus, string> = {
  exact: 'bg-match-green/20 border-match-green text-match-green',
  close: 'bg-match-amber/20 border-match-amber text-match-amber',
  none: 'bg-match-gray/10 border-match-gray text-slate-400',
};

const COLUMNS = [
  { key: 'name', label: 'Player', width: '28%' },
  { key: 'nation', label: 'Nation', width: '12%' },
  { key: 'league', label: 'League', width: '15%' },
  { key: 'club', label: 'Club', width: '15%' },
  { key: 'position', label: 'Pos', width: '8%' },
  { key: 'age', label: 'Age', width: '11%' },
  { key: 'shirt', label: '#', width: '11%' },
] as const;

const CELL_TRUNCATE = 'overflow-hidden text-ellipsis whitespace-nowrap';

export function GameGrid({ guesses, maxGuesses }: GameGridProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="table-fixed w-full border-separate border-spacing-y-1 border-spacing-x-1 min-w-[640px]">
        <colgroup>
          {COLUMNS.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>

        {/* Header */}
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-2 py-1.5 font-label text-xs uppercase tracking-wider text-slate-500 bg-ink-deep border border-ink-border rounded text-center"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Guess rows */}
          {guesses.map((row, idx) => (
            <tr key={idx} className="animate-row-in">
              {COLUMNS.map((col) => {
                const cell = row.cells[col.key as keyof typeof row.cells];
                const showArrow = col.key === 'age' || col.key === 'shirt';
                const fullText = col.key === 'name'
                  ? `${cell.value} (${row.player.club})`
                  : cell.value;

                return (
                  <td
                    key={col.key}
                    title={fullText}
                    className={`px-2 py-2.5 border rounded font-label text-sm font-semibold transition-colors duration-300 ${STATUS_COLORS[cell.status]} ${CELL_TRUNCATE}`}
                  >
                    {col.key === 'name' ? (
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-slate-200 text-sm overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{cell.value}</span>
                        <span className="text-xs text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{row.player.club}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{cell.value}</span>
                        {showArrow && cell.arrow && (
                          <span className="text-xs shrink-0">
                            {cell.arrow === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Empty rows (skipped entirely in Unlimited mode, which has no cap) */}
          {maxGuesses !== null && Array.from({ length: Math.max(0, maxGuesses - guesses.length) }).map((_, idx) => (
            <tr key={`empty-${idx}`}>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-2 py-2.5 border border-ink-border/50 rounded bg-ink-deep/30 text-center ${col.key === 'name' ? 'min-h-[44px]' : 'min-h-[36px]'}`}
                >
                  <span className="text-slate-700 text-xs">—</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
