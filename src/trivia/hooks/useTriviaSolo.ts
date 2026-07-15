/**
 * useTriviaSolo — entirely client-side solo quiz hook.
 *
 * No DB writes during gameplay. Questions are generated from the players table
 * at mount time, using the same question + decoy logic as multiplayer so the
 * experience is consistent.
 *
 * Scoring: +1 for correct, 0 for wrong. No bluffing mechanic (no one to bluff).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { SoloGameState, SoloOption, SoloQuestion } from '../types';
import type { TriviaPlayer } from '../lib/questions';
import { pickRoundQuestion } from '../lib/questions';
import { generateDecoys, shuffle } from '../lib/decoys';

const TOTAL_QUESTIONS = 10;

function buildSoloOptions(
  realAnswer: string,
  questionType: Parameters<typeof generateDecoys>[0]['questionType'],
  player: TriviaPlayer,
  allPlayers: TriviaPlayer[],
): SoloOption[] {
  const playerNamePool = allPlayers.map(p => p.name).filter(n => n !== realAnswer);
  const decoys = generateDecoys({
    questionType,
    realAnswer,
    count: 7,
    league: player.league,
    playerNamePool,
  });

  const options: SoloOption[] = [
    { id: 'real', text: realAnswer, is_real: true },
    ...decoys.map((text, i) => ({ id: `d${i}`, text, is_real: false })),
  ];
  return shuffle(options);
}

export function useTriviaSolo() {
  const [state, setState] = useState<SoloGameState>({
    questions: [],
    currentIndex: 0,
    selectedOptionId: null,
    status: 'loading',
    score: 0,
  });

  // Load players and pre-generate all questions on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from('players')
        .select(
          'id,name,nation,continent,club,league,position_code,position_group,' +
          'age,shirt_number,nickname,career_goals,career_assists,' +
          'first_club,first_club_joined_date,active',
        )
        .eq('active', true);

      if (cancelled) return;
      if (error || !data || data.length < 10) {
        setState(s => ({ ...s, status: 'finished' }));
        return;
      }

      const pool = data as unknown as TriviaPlayer[];
      const questions: SoloQuestion[] = [];
      const usedPairs = new Map<string, Set<string>>();

      for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const result = pickRoundQuestion(pool, usedPairs as Map<string, Set<import('../types').QuestionType>>);
        if (!result) break;

        const { player, question } = result;
        if (!usedPairs.has(player.id)) usedPairs.set(player.id, new Set());
        usedPairs.get(player.id)!.add(question.type);

        const options = buildSoloOptions(question.real_answer, question.type, player, pool);
        questions.push({
          type: question.type,
          text: question.text,
          options,
          real_answer: question.real_answer,
        });
      }

      if (!cancelled) {
        setState({
          questions,
          currentIndex: 0,
          selectedOptionId: null,
          status: questions.length > 0 ? 'question' : 'finished',
          score: 0,
        });
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /** Player selects an option — immediately reveal (no timer in solo mode). */
  const selectOption = useCallback((optionId: string) => {
    setState(s => {
      if (s.status !== 'question') return s;
      const q = s.questions[s.currentIndex];
      if (!q) return s;
      const correct = q.options.find(o => o.id === optionId)?.is_real ?? false;
      return {
        ...s,
        selectedOptionId: optionId,
        status: 'revealed',
        score: s.score + (correct ? 1 : 0),
      };
    });
  }, []);

  /** Advance to the next question or finish the game. */
  const nextQuestion = useCallback(() => {
    setState(s => {
      if (s.status !== 'revealed') return s;
      const nextIndex = s.currentIndex + 1;
      if (nextIndex >= s.questions.length) {
        return { ...s, status: 'finished' };
      }
      return {
        ...s,
        currentIndex: nextIndex,
        selectedOptionId: null,
        status: 'question',
      };
    });
  }, []);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const totalQuestions  = state.questions.length;

  return {
    status:          state.status,
    score:           state.score,
    currentIndex:    state.currentIndex,
    totalQuestions,
    currentQuestion,
    selectedOptionId: state.selectedOptionId,
    selectOption,
    nextQuestion,
  };
}
