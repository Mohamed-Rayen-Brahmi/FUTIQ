/**
 * useTriviaRoom — real-time multiplayer room hook.
 *
 * Architecture:
 * - Stable game state is stored in Supabase (trivia_rooms, trivia_participants,
 *   trivia_rounds, trivia_submissions, trivia_votes).
 * - Supabase Realtime Postgres Changes syncs updates to all clients instantly.
 * - Supabase Realtime Broadcast is used for fast ephemeral notifications
 *   (e.g. "N players have submitted").
 * - The HOST drives all phase transitions by writing to the DB. All clients
 *   react to DB changes — there is no separate host-to-client signalling needed.
 *
 * Phase transition logic (host only):
 *   lobby        → creates first round, sets room.status = 'playing'
 *   submission   → after timer or all-submitted: compiles 8 options, stores in
 *                  round.options (no attribution), advances phase to 'voting'
 *   voting       → after timer or all-voted: calculates scores, writes attribution
 *                  to round.options, updates participant scores, phase = 'reveal'
 *   reveal       → after N seconds (or host skip): creates next round or finishes
 *
 * Security note: answers are stored in the DB and are technically queryable by
 * any client. This is an accepted trade-off for guest-friendly play. The UI
 * never renders answers before reveal phase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type {
  TriviaRoom, TriviaParticipant, TriviaRound, TriviaSubmission, TriviaVote,
  TriviaOption, RoundScoreDelta,
} from '../types';
import type { TriviaPlayer } from '../lib/questions';
import { pickRoundQuestion } from '../lib/questions';
import { generateDecoys, shuffle } from '../lib/decoys';
import { generateRoomCode, getOrCreateSessionId, setSessionId } from '../lib/roomCode';
import type { RealtimeChannel } from '@supabase/supabase-js';

const SUBMISSION_SECONDS = 30;
const VOTING_SECONDS     = 30;
const REVEAL_SECONDS     = 12;
const MAX_OPTIONS        = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function secondsFromNow(s: number): string {
  return new Date(Date.now() + s * 1000).toISOString();
}

function compileOptions(
  realAnswer: string,
  submissions: TriviaSubmission[],
  questionType: TriviaOption['id'] extends string ? Parameters<typeof generateDecoys>[0]['questionType'] : never,
  league: string | null,
  allPlayerNames: string[],
): TriviaOption[] {
  // Real option
  const opts: TriviaOption[] = [
    { id: 'real', text: realAnswer, is_real: false }, // is_real hidden until reveal
  ];

  // Human submissions (excluding any that duplicate the real answer)
  for (const sub of submissions) {
    if (sub.answer_text.trim().toLowerCase() === realAnswer.toLowerCase()) continue;
    if (opts.some(o => o.text.toLowerCase() === sub.answer_text.trim().toLowerCase())) continue;
    opts.push({
      id: `sub_${sub.session_id.slice(0, 8)}`,
      text: sub.answer_text.trim(),
      // session_id stored so host can attribute at reveal — stripped before storing
      session_id: sub.session_id,
    });
    if (opts.length >= MAX_OPTIONS) break;
  }

  // System decoys to pad up to MAX_OPTIONS
  const needed = MAX_OPTIONS - opts.length;
  if (needed > 0) {
    const existingTexts = new Set(opts.map(o => o.text.toLowerCase()));
    const pool = allPlayerNames.filter(n => !existingTexts.has(n.toLowerCase()));
    const decoys = generateDecoys({
      questionType: questionType as Parameters<typeof generateDecoys>[0]['questionType'],
      realAnswer,
      count: needed,
      league,
      playerNamePool: pool,
    });
    for (const d of decoys) {
      if (opts.length >= MAX_OPTIONS) break;
      if (!existingTexts.has(d.toLowerCase())) {
        opts.push({ id: `sys_${opts.length}`, text: d });
        existingTexts.add(d.toLowerCase());
      }
    }
  }

  // Shuffle, then strip session_id from the voting-phase copy (host keeps a separate attributed copy)
  shuffle(opts);
  // Reassign ids post-shuffle so they reflect stable positions
  return opts.map((o, i) => ({ id: `opt_${i}`, text: o.text, session_id: o.session_id }));
}

function computeScoreDeltas(
  revealedOptions: TriviaOption[],
  votes: TriviaVote[],
  participants: TriviaParticipant[],
): RoundScoreDelta[] {
  const sessionToName = new Map(participants.map(p => [p.session_id, p.display_name]));
  const real = revealedOptions.find(o => o.is_real);
  const deltas: RoundScoreDelta[] = [];

  for (const p of participants) {
    let delta = 0;
    const myVote = votes.find(v => v.voter_session_id === p.session_id);
    const guessed_correctly = !!(myVote && myVote.option_id === real?.id);
    if (guessed_correctly) delta += 2;

    // +1 for every OTHER player who voted for MY fake
    const myOption = revealedOptions.find(
      o => !o.is_real && o.session_id === p.session_id,
    );
    let fooled_count = 0;
    if (myOption) {
      fooled_count = votes.filter(
        v => v.option_id === myOption.id && v.voter_session_id !== p.session_id,
      ).length;
      delta += fooled_count;
    }

    deltas.push({
      session_id: p.session_id,
      display_name: sessionToName.get(p.session_id) ?? 'Player',
      delta,
      reason: { guessed_correctly, fooled_count },
    });
  }

  return deltas;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export type RoomError = 'not_found' | 'full' | 'db_error' | null;

export interface TriviaRoomState {
  room: TriviaRoom | null;
  participants: TriviaParticipant[];
  currentRound: TriviaRound | null;
  submissions: TriviaSubmission[];   // available to host for compilation
  votes: TriviaVote[];
  submittedSessions: Set<string>;    // who has submitted (for UI only — no answers)
  lastScoreDeltas: RoundScoreDelta[];
  mySessionId: string;
  isHost: boolean;
  error: RoomError;
  loading: boolean;
}

export function useTriviaRoom() {
  const sessionId = getOrCreateSessionId();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerPoolRef = useRef<TriviaPlayer[]>([]);
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<TriviaRoomState>({
    room: null,
    participants: [],
    currentRound: null,
    submissions: [],
    votes: [],
    submittedSessions: new Set(),
    lastScoreDeltas: [],
    mySessionId: sessionId,
    isHost: false,
    error: null,
    loading: false,
  });

  // ── Load player pool once (used for question generation) ──────────────────
  useEffect(() => {
    supabase
      .from('players')
      .select(
        'id,name,nation,continent,club,league,position_code,position_group,' +
        'age,shirt_number,nickname,career_goals,career_assists,' +
        'first_club,first_club_joined_date,active',
      )
      .eq('active', true)
      .then(({ data }) => {
        if (data) playerPoolRef.current = data as unknown as TriviaPlayer[];
      });
  }, []);

  // ── Realtime subscription ──────────────────────────────────────────────────
  function subscribeToRoom(roomId: string) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`trivia:${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trivia_rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        setState(s => ({ ...s, room: payload.new as TriviaRoom }));
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trivia_participants',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        refreshParticipants(roomId);
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trivia_rounds',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const round = payload.new as TriviaRound;
        setState(s => ({
          ...s,
          currentRound: round,
          // Reset per-round transient state when a new round starts
          submissions: round.round_number !== s.currentRound?.round_number ? [] : s.submissions,
          votes: round.round_number !== s.currentRound?.round_number ? [] : s.votes,
          submittedSessions: round.round_number !== s.currentRound?.round_number
            ? new Set()
            : s.submittedSessions,
        }));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trivia_submissions',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const sub = payload.new as TriviaSubmission;
        setState(s => ({
          ...s,
          submissions: [...s.submissions.filter(x => x.id !== sub.id), sub],
          submittedSessions: new Set([...s.submittedSessions, sub.session_id]),
        }));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'trivia_votes',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const vote = payload.new as TriviaVote;
        setState(s => ({ ...s, votes: [...s.votes.filter(x => x.id !== vote.id), vote] }));
      })
      .subscribe();

    channelRef.current = channel;
  }

  async function refreshParticipants(roomId: string) {
    const { data } = await supabase
      .from('trivia_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at');
    if (data) {
      setState(s => ({
        ...s,
        participants: data as TriviaParticipant[],
        isHost: data.some(p => p.session_id === s.mySessionId && p.is_host),
      }));
    }
  }

  async function fetchFullRoomState(room: TriviaRoom) {
    const { data: rounds } = await supabase
      .from('trivia_rounds')
      .select('*')
      .eq('room_id', room.id)
      .eq('round_number', room.current_round_number)
      .limit(1);
    
    const currentRound = rounds?.[0] as TriviaRound | undefined;
    let submissions: TriviaSubmission[] = [];
    let votes: TriviaVote[] = [];
    let submittedSessions = new Set<string>();

    if (currentRound) {
      const { data: subsData } = await supabase
        .from('trivia_submissions')
        .select('*')
        .eq('round_id', currentRound.id);
      
      if (subsData) {
        submissions = subsData as TriviaSubmission[];
        submittedSessions = new Set(submissions.map(s => s.session_id));
      }

      const { data: votesData } = await supabase
        .from('trivia_votes')
        .select('*')
        .eq('round_id', currentRound.id);
      
      if (votesData) {
        votes = votesData as TriviaVote[];
      }
    }

    setState(s => ({
      ...s,
      room,
      currentRound: currentRound ?? null,
      submissions,
      votes,
      submittedSessions,
      loading: false,
    }));
  }

  // ── Create room ────────────────────────────────────────────────────────────
  const createRoom = useCallback(async (displayName: string, totalRounds: 5 | 10 | 15) => {
    setState(s => ({ ...s, loading: true, error: null }));
    const code = generateRoomCode();

    const { data: room, error: roomErr } = await supabase
      .from('trivia_rooms')
      .insert({
        room_code: code,
        host_session_id: sessionId,
        host_name: displayName,
        total_rounds: totalRounds,
      })
      .select()
      .single();

    if (roomErr || !room) {
      setState(s => ({ ...s, loading: false, error: 'db_error' }));
      return null;
    }

    const { error: partErr } = await supabase
      .from('trivia_participants')
      .insert({
        room_id: room.id,
        session_id: sessionId,
        display_name: displayName,
        is_host: true,
      });

    if (partErr) {
      setState(s => ({ ...s, loading: false, error: 'db_error' }));
      return null;
    }

    subscribeToRoom(room.id);
    await refreshParticipants(room.id);
    setState(s => ({ ...s, room: room as TriviaRoom, loading: false, isHost: true }));
    return code;
  }, [sessionId]);

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (code: string, displayName: string) => {
    setState(s => ({ ...s, loading: true, error: null }));

    const { data: rooms, error: fetchErr } = await supabase
      .from('trivia_rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .limit(1);

    if (fetchErr || !rooms || rooms.length === 0) {
      setState(s => ({ ...s, loading: false, error: 'not_found' }));
      return false;
    }

    const room = rooms[0] as TriviaRoom;
    if (room.status === 'finished') {
      setState(s => ({ ...s, loading: false, error: 'not_found' }));
      return false;
    }

    // 1. Check if we are already in this room using our current sessionId
    let { data: existing } = await supabase
      .from('trivia_participants')
      .select('id, session_id')
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .limit(1);

    // 2. Check if we are trying to rejoin by using an existing display name
    if (!existing || existing.length === 0) {
      const { data: existingByName } = await supabase
        .from('trivia_participants')
        .select('id, session_id')
        .eq('room_id', room.id)
        .ilike('display_name', displayName.trim())
        .limit(1);
        
      if (existingByName && existingByName.length > 0) {
        // Take over this session!
        const targetSessionId = existingByName[0].session_id;
        setSessionId(targetSessionId);
        existing = existingByName;
        // Update local state so it reflects the new session immediately
        setState(s => ({ ...s, mySessionId: targetSessionId }));
      }
    }

    // 3. If still completely new, insert as a new participant
    if (!existing || existing.length === 0) {
      // Don't allow completely new players to join a game that's already playing
      if (room.status !== 'lobby') {
        setState(s => ({ ...s, loading: false, error: 'not_found' }));
        return false;
      }
      
      const { data: allParts } = await supabase
        .from('trivia_participants')
        .select('id')
        .eq('room_id', room.id);

      if (allParts && allParts.length >= 8) {
        setState(s => ({ ...s, loading: false, error: 'full' }));
        return false;
      }

      const { error: joinErr } = await supabase
        .from('trivia_participants')
        .insert({
          room_id: room.id,
          session_id: sessionId,
          display_name: displayName.trim(),
          is_host: false,
        });

      if (joinErr) {
        setState(s => ({ ...s, loading: false, error: 'db_error' }));
        return false;
      }
    }

    subscribeToRoom(room.id);
    await refreshParticipants(room.id);
    await fetchFullRoomState(room);
    return true;
  }, [sessionId]);

  // ── HOST: Start game ───────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const { room } = state;
    if (!room || !state.isHost) return;

    const result = pickRoundQuestion(playerPoolRef.current, usedQuestionIdsRef.current);
    if (!result) return;
    const { player, question } = result;
    markUsed(question.id!);

    await supabase.from('trivia_rooms').update({
      status: 'playing',
      current_round_number: 1,
    }).eq('id', room.id);

    await supabase.from('trivia_rounds').insert({
      room_id: room.id,
      round_number: 1,
      question_type: question.type,
      question_text: question.text,
      real_answer: question.real_answer,
      options: null,
      phase: 'submission',
      phase_ends_at: secondsFromNow(SUBMISSION_SECONDS),
    });

    schedulePhaseTimeout(room, 1, 'submission');
  }, [state]);

  // ── Player: Submit answer ──────────────────────────────────────────────────
  const submitAnswer = useCallback(async (answerText: string) => {
    const { room, currentRound } = state;
    if (!room || !currentRound || currentRound.phase !== 'submission') return;

    await supabase.from('trivia_submissions').upsert({
      round_id: currentRound.id,
      room_id: room.id,
      session_id: sessionId,
      answer_text: answerText.trim(),
    }, { onConflict: 'round_id,session_id' });
  }, [state, sessionId]);

  // ── Player: Vote ───────────────────────────────────────────────────────────
  const submitVote = useCallback(async (optionId: string) => {
    const { room, currentRound } = state;
    if (!room || !currentRound || currentRound.phase !== 'voting') return;

    await supabase.from('trivia_votes').upsert({
      round_id: currentRound.id,
      room_id: room.id,
      voter_session_id: sessionId,
      option_id: optionId,
    }, { onConflict: 'round_id,voter_session_id' });
  }, [state, sessionId]);

  // ── HOST: Advance submission → voting ──────────────────────────────────────
  const advanceToVoting = useCallback(async () => {
    const { room, currentRound, submissions, participants } = state;
    if (!room || !currentRound || !state.isHost) return;

    clearTimer();
    const allPlayerNames = playerPoolRef.current.map(p => p.name);
    const options = compileOptions(
      currentRound.real_answer,
      submissions,
      currentRound.question_type as Parameters<typeof compileOptions>[2],
      participants.find(p => p.session_id === sessionId)?.room_id ? null : null,
      allPlayerNames,
    );

    // Strip session_id from the voting-phase version (attribution added at reveal)
    const votingOptions = options.map(({ id, text }) => ({ id, text }));

    await supabase.from('trivia_rounds').update({
      options: votingOptions,
      phase: 'voting',
      phase_ends_at: secondsFromNow(VOTING_SECONDS),
    }).eq('id', currentRound.id);

    // Keep the attributed copy in memory for scoring at reveal
    (currentRound as TriviaRound & { _attributedOptions?: TriviaOption[] })._attributedOptions = options;

    schedulePhaseTimeout(room, currentRound.round_number, 'voting');
  }, [state, sessionId]);

  // ── HOST: Advance voting → reveal ──────────────────────────────────────────
  const advanceToReveal = useCallback(async () => {
    const { room, currentRound, submissions, votes, participants } = state;
    if (!room || !currentRound || !state.isHost) return;

    clearTimer();
    // Rebuild attributed options (with is_real + submitted_by)
    const allPlayerNames = playerPoolRef.current.map(p => p.name);
    const allOptions = compileOptions(
      currentRound.real_answer,
      submissions,
      currentRound.question_type as Parameters<typeof compileOptions>[2],
      null,
      allPlayerNames,
    );
    // We need the shuffled order that was stored — re-read it from DB
    const storedOptions = (currentRound.options as TriviaOption[]) ?? allOptions;

    const sessionToName = new Map(participants.map(p => [p.session_id, p.display_name]));
    const revealedOptions: TriviaOption[] = storedOptions.map(o => {
      const matchingSub = submissions.find(
        s => s.answer_text.trim().toLowerCase() === o.text.toLowerCase(),
      );
      const isReal = o.text.toLowerCase() === currentRound.real_answer.toLowerCase();
      return {
        id: o.id,
        text: o.text,
        is_real: isReal,
        submitted_by: matchingSub ? sessionToName.get(matchingSub.session_id) : undefined,
        session_id: matchingSub?.session_id,
      };
    });

    const deltas = computeScoreDeltas(revealedOptions, votes, participants);

    // Write reveal data and scores
    await supabase.from('trivia_rounds').update({
      options: revealedOptions,
      phase: 'reveal',
      phase_ends_at: secondsFromNow(REVEAL_SECONDS),
    }).eq('id', currentRound.id);

    // Update all participant scores
    for (const delta of deltas) {
      await supabase.from('trivia_participants').update({
        score: participants.find(p => p.session_id === delta.session_id)!.score + delta.delta,
      }).eq('room_id', room.id).eq('session_id', delta.session_id);
    }

    setState(s => ({ ...s, lastScoreDeltas: deltas }));
    schedulePhaseTimeout(room, currentRound.round_number, 'reveal');
  }, [state]);

  // ── HOST: Advance to next round or finish ──────────────────────────────────
  const advanceToNextRound = useCallback(async () => {
    const { room, currentRound } = state;
    if (!room || !currentRound || !state.isHost) return;

    clearTimer();
    const nextRoundNumber = currentRound.round_number + 1;

    if (nextRoundNumber > room.total_rounds) {
      await supabase.from('trivia_rooms').update({ status: 'finished' }).eq('id', room.id);
      return;
    }

    const result = pickRoundQuestion(playerPoolRef.current, usedQuestionIdsRef.current);
    if (!result) {
      await supabase.from('trivia_rooms').update({ status: 'finished' }).eq('id', room.id);
      return;
    }
    const { player, question } = result;
    markUsed(question.id!);

    await supabase.from('trivia_rooms').update({
      current_round_number: nextRoundNumber,
    }).eq('id', room.id);

    await supabase.from('trivia_rounds').insert({
      room_id: room.id,
      round_number: nextRoundNumber,
      question_type: question.type,
      question_text: question.text,
      real_answer: question.real_answer,
      options: null,
      phase: 'submission',
      phase_ends_at: secondsFromNow(SUBMISSION_SECONDS),
    });

    schedulePhaseTimeout(room, nextRoundNumber, 'submission');
  }, [state]);

  // ── Phase auto-advance timers (host only) ──────────────────────────────────
  function clearTimer() {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  function schedulePhaseTimeout(_room: TriviaRoom, _roundNumber: number, phase: string) {
    clearTimer();
    const durations: Record<string, number> = {
      submission: SUBMISSION_SECONDS,
      voting:     VOTING_SECONDS,
      reveal:     REVEAL_SECONDS,
    };
    const ms = (durations[phase] ?? SUBMISSION_SECONDS) * 1000;
    phaseTimerRef.current = setTimeout(() => {
      if (phase === 'submission') advanceToVoting();
      else if (phase === 'voting')  advanceToReveal();
      else if (phase === 'reveal')  advanceToNextRound();
    }, ms + 500); // +500ms buffer for network jitter
  }

  function markUsed(questionId: string) {
    usedQuestionIdsRef.current.add(questionId);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimer();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    submitVote,
    advanceToVoting,
    advanceToReveal,
    advanceToNextRound,
    SUBMISSION_SECONDS,
    VOTING_SECONDS,
    REVEAL_SECONDS,
  };
}
