import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, ArrowRight, Trophy, Zap } from 'lucide-react';
import { normaliseRoomCode } from '../lib/roomCode';
import { AdBanner } from '../../components/AdBanner';

export function TriviaLandingPage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = normaliseRoomCode(joinCode);
    if (code.length === 6) navigate(`/trivia/room/${code}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-10 animate-fade-in">

      {/* Hero */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="skew-parallelogram px-4 py-1"
            style={{ background: 'linear-gradient(135deg, #d8b458, #ff5b3d)' }}
          >
            <span className="skew-inner font-label text-xs font-bold uppercase tracking-widest text-ink-base">
              New Mode
            </span>
          </div>
        </div>

        <h1
          className="font-display text-6xl sm:text-7xl leading-none mb-3"
          style={{
            background: 'linear-gradient(135deg, #d8b458 0%, #ff5b3d 60%, #e8c878 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 30px rgba(216,180,88,0.3))',
          }}
        >
          BLUFF
        </h1>
        <p className="font-display text-3xl text-slate-400 tracking-wide mb-4">
          Football Trivia Party
        </p>
        <p className="font-body text-slate-400 max-w-md mx-auto">
          A football trivia question is asked. Everyone submits a fake answer
          trying to sound legit — then you all vote on which one is real.
          Score for guessing right, and for fooling others.
        </p>
      </div>

      {/* How it works */}
      <div className="w-full grid sm:grid-cols-3 gap-4">
        {[
          { icon: <Zap size={20} className="text-cta" />, title: 'Submit', desc: 'Write a convincing fake answer to fool your friends' },
          { icon: <Users size={20} className="text-gold" />, title: 'Vote', desc: 'Pick which of the 8 options is the real correct answer' },
          { icon: <Trophy size={20} className="text-match-green" />, title: 'Score', desc: '+2 for guessing right, +1 per player who falls for your bluff' },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="panel-surface p-4 text-center"
            style={{ background: 'linear-gradient(135deg, #121a22 0%, #131c24 100%)' }}
          >
            <div className="flex justify-center mb-2">{icon}</div>
            <p className="font-display text-xl text-slate-200 mb-1">{title}</p>
            <p className="font-body text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Mode selection */}
      <div
        className="w-full panel-surface overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d141a 0%, #121a22 100%)' }}
      >
        {/* Tabs */}
        <div className="flex border-b border-ink-border">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                flex-1 py-3 font-label text-sm uppercase tracking-wide transition-colors duration-200
                ${tab === t
                  ? 'text-gold border-b-2 border-gold -mb-px'
                  : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'create' ? (
            <div className="flex flex-col gap-4">
              <p className="font-body text-sm text-slate-400 text-center">
                Create a room and share the code with up to 7 friends.
              </p>
              <button
                onClick={() => navigate('/trivia/room/new')}
                className="skew-parallelogram bg-gold text-ink-base font-label font-bold uppercase tracking-wide px-8 py-3 hover:bg-gold-light transition-colors duration-200 self-center"
              >
                <span className="skew-inner flex items-center gap-2">
                  <Users size={16} /> Create Room <ArrowRight size={16} />
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <p className="font-body text-sm text-slate-400 text-center">
                Enter the 6-character room code from your host.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 bg-ink-panel border-2 border-ink-border focus:border-gold rounded-lg px-4 py-3 font-display text-2xl text-center text-slate-100 placeholder-slate-700 outline-none tracking-[0.3em] transition-colors duration-200 uppercase"
                />
                <button
                  type="submit"
                  disabled={joinCode.length < 6}
                  className={`
                    skew-parallelogram font-label font-bold uppercase tracking-wide px-5 py-3 transition-colors duration-200
                    ${joinCode.length === 6
                      ? 'bg-cta text-white hover:bg-cta-light'
                      : 'bg-ink-border text-slate-600 cursor-not-allowed'}
                  `}
                >
                  <span className="skew-inner flex items-center gap-1.5">
                    Join <ArrowRight size={15} />
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Solo mode */}
        <div className="border-t border-ink-border px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-label text-sm text-slate-400 uppercase tracking-wide">Solo Practice</p>
            <p className="font-body text-xs text-slate-600">10 questions, no bluffing — just quiz</p>
          </div>
          <button
            onClick={() => navigate('/trivia/solo')}
            className="skew-parallelogram bg-transparent border border-ink-border text-slate-300 hover:border-gold hover:text-gold font-label font-semibold uppercase tracking-wide px-4 py-2 transition-colors duration-200"
          >
            <span className="skew-inner flex items-center gap-1.5">
              <User size={14} /> Solo
            </span>
          </button>
        </div>
      </div>

      {/* Ads */}
      <AdBanner dataAdSlot="trivia-landing" />
    </div>
  );
}
