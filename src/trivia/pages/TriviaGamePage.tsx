import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTriviaRoom } from '../hooks/useTriviaRoom';
import { SubmissionScreen } from '../components/SubmissionScreen';
import { VotingScreen } from '../components/VotingScreen';
import { RevealScreen } from '../components/RevealScreen';
import { FinalResults } from '../components/FinalResults';
import { Scoreboard } from '../components/Scoreboard';
import { Spinner } from '../../components/ui';
import type { TriviaOption } from '../types';
import { AdBanner } from '../../components/AdBanner';

export function TriviaGamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate  = useNavigate();

  const {
    room, participants, currentRound,
    submissions, votes, submittedSessions, lastScoreDeltas,
    mySessionId, isHost, error, loading,
    joinRoom, submitAnswer, submitVote,
    advanceToVoting, advanceToReveal, advanceToNextRound,
    SUBMISSION_SECONDS, VOTING_SECONDS,
  } = useTriviaRoom();

  const [myVoteId, setMyVoteId] = useState<string | null>(null);
  const [mySubmitted, setMySubmitted] = useState(false);

  // Rejoin by code if we're hitting /trivia/game/:code directly
  useEffect(() => {
    if (!room && code && !loading) {
      const name = sessionStorage.getItem('trivia-display-name') ?? 'Player';
      joinRoom(code, name);
    }
  }, [room, code, loading]);

  // Reset per-round client state when round changes
  useEffect(() => {
    setMyVoteId(null);
    setMySubmitted(
      submissions.some(s => s.session_id === mySessionId)
    );
  }, [currentRound?.id]);

  // Host auto-advance: watch submission count vs participant count
  useEffect(() => {
    if (!isHost || !currentRound || currentRound.phase !== 'submission') return;
    if (submittedSessions.size >= participants.length && participants.length > 0) {
      // All submitted — advance immediately
      const t = setTimeout(() => advanceToVoting(), 1500);
      return () => clearTimeout(t);
    }
  }, [submittedSessions.size, participants.length, currentRound?.phase, isHost]);

  // Host auto-advance: watch vote count
  useEffect(() => {
    if (!isHost || !currentRound || currentRound.phase !== 'voting') return;
    if (votes.length >= participants.length && participants.length > 0) {
      const t = setTimeout(() => advanceToReveal(), 1500);
      return () => clearTimeout(t);
    }
  }, [votes.length, participants.length, currentRound?.phase, isHost]);

  function handleSubmit(answer: string) {
    setMySubmitted(true);
    submitAnswer(answer);
  }

  function handleVote(optionId: string) {
    setMyVoteId(optionId);
    submitVote(optionId);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || (!room && !error)) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <Spinner className="text-4xl text-gold" />
        <p className="font-label text-sm uppercase tracking-wide text-slate-500">Connecting…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-20 gap-4 text-center px-4">
        <p className="font-display text-3xl text-cta">Error</p>
        <p className="font-body text-slate-400">
          {error === 'not_found' ? 'Room not found.' :
           error === 'full' ? 'Room is full.' :
           'Something went wrong connecting to the room.'}
        </p>
        <button onClick={() => navigate('/trivia')} className="skew-parallelogram bg-gold text-ink-base font-label font-semibold uppercase tracking-wide px-6 py-2.5 hover:bg-gold-light transition-colors duration-200">
          <span className="skew-inner">Back to Trivia</span>
        </button>
      </div>
    );
  }

  if (room?.status === 'finished') {
    return (
      <FinalResults
        participants={participants}
        mySessionId={mySessionId}
        roomCode={room.room_code}
      />
    );
  }

  if (!currentRound) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <Spinner className="text-4xl text-gold" />
        <p className="font-label text-sm uppercase tracking-wide text-slate-500">
          Waiting for host to start…
        </p>
      </div>
    );
  }

  const phase = currentRound.phase;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Main game area */}
        <div>
          {phase === 'submission' && (
            <SubmissionScreen
              questionText={currentRound.question_text}
              roundNumber={currentRound.round_number}
              totalRounds={room?.total_rounds ?? 5}
              phaseEndsAt={currentRound.phase_ends_at}
              totalSeconds={SUBMISSION_SECONDS}
              hasSubmitted={mySubmitted || submissions.some(s => s.session_id === mySessionId)}
              onSubmit={handleSubmit}
              participantCount={participants.length}
              submittedCount={submittedSessions.size}
            />
          )}

          {phase === 'voting' && currentRound.options && (
            <VotingScreen
              questionText={currentRound.question_text}
              roundNumber={currentRound.round_number}
              totalRounds={room?.total_rounds ?? 5}
              options={currentRound.options as TriviaOption[]}
              phaseEndsAt={currentRound.phase_ends_at}
              totalSeconds={VOTING_SECONDS}
              selectedOptionId={myVoteId}
              onVote={handleVote}
              participantCount={participants.length}
              votedCount={votes.length}
            />
          )}

          {phase === 'reveal' && currentRound.options && (
            <RevealScreen
              questionText={currentRound.question_text}
              roundNumber={currentRound.round_number}
              totalRounds={room?.total_rounds ?? 5}
              options={currentRound.options as TriviaOption[]}
              votes={votes}
              scoreDeltas={lastScoreDeltas}
              participants={participants}
              mySessionId={mySessionId}
              isHost={isHost}
              isLastRound={currentRound.round_number >= (room?.total_rounds ?? 5)}
              onNext={advanceToNextRound}
            />
          )}

          {/* Host phase-skip buttons (for when all players act early) */}
          {isHost && phase === 'submission' && (
            <div className="mt-4 text-center">
              <button
                onClick={advanceToVoting}
                className="skew-parallelogram bg-transparent border border-ink-border text-slate-400 hover:border-cta hover:text-cta font-label text-xs font-semibold uppercase tracking-wide px-4 py-2 transition-colors duration-200"
              >
                <span className="skew-inner">Skip to Voting →</span>
              </button>
            </div>
          )}
          {isHost && phase === 'voting' && (
            <div className="mt-4 text-center">
              <button
                onClick={advanceToReveal}
                className="skew-parallelogram bg-transparent border border-ink-border text-slate-400 hover:border-cta hover:text-cta font-label text-xs font-semibold uppercase tracking-wide px-4 py-2 transition-colors duration-200"
              >
                <span className="skew-inner">Skip to Reveal →</span>
              </button>
            </div>
          )}

          {/* Ads */}
          <AdBanner dataAdSlot="trivia-game" className="mt-8" />
        </div>

        {/* Sidebar scoreboard */}
        <div className="lg:sticky lg:top-6">
          <Scoreboard
            participants={participants}
            mySessionId={mySessionId}
            roundNumber={currentRound.round_number}
            totalRounds={room?.total_rounds}
          />
        </div>
      </div>
    </div>
  );
}
