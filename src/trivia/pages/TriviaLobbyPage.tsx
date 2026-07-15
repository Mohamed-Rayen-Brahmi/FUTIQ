import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTriviaRoom } from '../hooks/useTriviaRoom';
import { Spinner } from '../../components/ui';
import { Copy, Check, ArrowLeft, Users, Play } from 'lucide-react';
import { AdBanner } from '../../components/AdBanner';

type SetupStep = 'name' | 'rounds';

export function TriviaLobbyPage() {
  const { code } = useParams<{ code?: string }>();
  const navigate  = useNavigate();
  const isCreating = code === 'new';

  const {
    room, participants, mySessionId, isHost, error, loading,
    createRoom, joinRoom, startGame,
  } = useTriviaRoom();

  const [displayName, setDisplayName] = useState('');
  const [totalRounds, setTotalRounds] = useState<5 | 10 | 15>(5);
  const [joinCode, setJoinCode]       = useState(code && code !== 'new' ? code : '');
  const [step, setStep]               = useState<SetupStep>('name');
  const [copied, setCopied]           = useState(false);

  // Once the room starts playing, navigate to the game page
  if (room?.status === 'playing') {
    navigate(`/trivia/game/${room.room_code}`, { replace: true });
    return null;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    if (step === 'name') { setStep('rounds'); return; }
    const roomCode = await createRoom(displayName.trim(), totalRounds);
    if (!roomCode) return; // error handled in hook
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || joinCode.length < 6) return;
    const ok = await joinRoom(joinCode.toUpperCase(), displayName.trim());
    if (!ok) return;
  }

  function copyCode() {
    if (!room) return;
    const url = `${window.location.origin}/trivia/room/${room.room_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // In-lobby view (room already created/joined)
  if (room) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6 animate-fade-in">
        {/* Room code */}
        <div className="text-center">
          <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <h1
              className="font-display text-7xl tracking-[0.25em] leading-none"
              style={{
                background: 'linear-gradient(135deg, #d8b458, #ff5b3d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(216,180,88,0.4))',
              }}
            >
              {room.room_code}
            </h1>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg border border-ink-border text-slate-500 hover:border-gold hover:text-gold transition-colors duration-200"
              title="Copy join link"
            >
              {copied ? <Check size={18} className="text-match-green" /> : <Copy size={18} />}
            </button>
          </div>
          <p className="font-body text-sm text-slate-500 mt-2">
            Share this code with friends to join
          </p>
        </div>

        {/* Players list */}
        <div className="panel-surface p-4">
          <p className="font-label text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Users size={12} /> Players ({participants.length}/8)
          </p>
          <div className="flex flex-col gap-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-2 py-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-match-green"
                  style={{ boxShadow: '0 0 8px rgba(46,204,113,0.6)' }}
                />
                <span className={`font-body text-sm ${p.session_id === mySessionId ? 'text-gold' : 'text-slate-300'}`}>
                  {p.display_name}
                  {p.session_id === mySessionId && ' (you)'}
                  {p.is_host && (
                    <span className="ml-2 font-label text-xs text-slate-600 uppercase tracking-wide">
                      [host]
                    </span>
                  )}
                </span>
              </div>
            ))}
            {participants.length < 2 && (
              <p className="font-body text-xs text-slate-600 mt-1">
                Waiting for at least 1 more player…
              </p>
            )}
          </div>
        </div>

        {/* Game settings */}
        <div className="panel-surface px-4 py-3 flex items-center justify-between">
          <span className="font-label text-xs uppercase tracking-wide text-slate-500">Rounds</span>
          <span className="font-display text-2xl text-gold">{room.total_rounds}</span>
        </div>

        {/* Host start button */}
        {isHost && (
          <button
            onClick={startGame}
            disabled={participants.length < 2}
            className={`
              skew-parallelogram font-label font-bold uppercase tracking-widest py-4 px-10 self-center
              transition-all duration-200
              ${participants.length >= 2
                ? 'bg-gold text-ink-base hover:bg-gold-light'
                : 'bg-ink-border text-slate-600 cursor-not-allowed'}
            `}
            style={participants.length >= 2 ? { boxShadow: '0 0 30px rgba(216,180,88,0.25)' } : undefined}
          >
            <span className="skew-inner flex items-center gap-2 text-lg">
              <Play size={18} /> Start Game
            </span>
          </button>
        )}

        {!isHost && (
          <p className="font-body text-sm text-center text-slate-500 animate-fade-in">
            Waiting for the host to start the game…
          </p>
        )}

        {error && (
          <p className="font-body text-sm text-cta text-center">
            {error === 'not_found' ? 'Room not found or game already started.' :
             error === 'full' ? 'This room is full (8 players max).' :
             'Something went wrong. Please try again.'}
          </p>
        )}

        {/* Ads */}
        <AdBanner dataAdSlot="trivia-lobby" className="mt-8" />
      </div>
    );
  }

  // Setup view (name / room code entry)
  return (
    <div className="max-w-md mx-auto px-4 py-10 flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/trivia')}
          className="text-slate-500 hover:text-gold transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-4xl text-gold">
          {isCreating ? 'Create Room' : 'Join Room'}
        </h1>
      </div>

      <form onSubmit={isCreating ? handleCreate : handleJoin} className="flex flex-col gap-4">
        {/* Display name — always first */}
        <div>
          <label className="font-label text-xs uppercase tracking-wide text-slate-500 mb-1.5 block">
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value.slice(0, 20))}
            placeholder="Enter a nickname…"
            maxLength={20}
            className="w-full bg-ink-panel border-2 border-ink-border focus:border-gold rounded-lg px-4 py-3 font-body text-lg text-slate-100 placeholder-slate-600 outline-none transition-colors duration-200"
            autoFocus
          />
        </div>

        {/* Join-specific: room code */}
        {!isCreating && (
          <div>
            <label className="font-label text-xs uppercase tracking-wide text-slate-500 mb-1.5 block">
              Room code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-ink-panel border-2 border-ink-border focus:border-gold rounded-lg px-4 py-3 font-display text-3xl text-center text-slate-100 placeholder-slate-700 outline-none tracking-[0.35em] transition-colors duration-200 uppercase"
            />
          </div>
        )}

        {/* Create-specific step 2: round count */}
        {isCreating && step === 'rounds' && (
          <div>
            <label className="font-label text-xs uppercase tracking-wide text-slate-500 mb-1.5 block">
              Number of rounds
            </label>
            <div className="flex gap-3">
              {([5, 10, 15] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTotalRounds(n)}
                  className={`
                    flex-1 py-3 rounded-lg border-2 font-display text-3xl transition-all duration-200
                    ${totalRounds === n
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-ink-panel border-ink-border text-slate-400 hover:border-slate-500'}
                  `}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!displayName.trim() || loading || (!isCreating && joinCode.length < 6)}
          className={`
            skew-parallelogram font-label font-bold uppercase tracking-wide py-3.5 px-8 self-center
            transition-all duration-200 mt-2
            ${displayName.trim() && (!(!isCreating && joinCode.length < 6))
              ? 'bg-gold text-ink-base hover:bg-gold-light'
              : 'bg-ink-border text-slate-600 cursor-not-allowed'}
          `}
        >
          <span className="skew-inner flex items-center gap-2">
            {loading ? <Spinner className="text-lg text-ink-base" /> : null}
            {isCreating
              ? step === 'name' ? 'Next' : 'Create Room'
              : 'Join Room'}
          </span>
        </button>
      </form>

      {error && (
        <p className="font-body text-sm text-cta text-center">
          {error === 'not_found' ? 'Room not found or game already started.' :
           error === 'full' ? 'This room is full (8 players max).' :
           'Something went wrong. Please try again.'}
        </p>
      )}

      {/* Ads */}
      <AdBanner dataAdSlot="trivia-lobby-setup" className="mt-8" />
    </div>
  );
}
