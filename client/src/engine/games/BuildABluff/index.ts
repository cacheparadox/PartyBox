import type { GamePlugin } from '../GamePlugin';
import { createBaseState, shuffle, pickRandom } from '../GamePlugin';
import type { BuildABluffGameState, BluffAnswer } from '../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';
import { generateTriviaQuestion } from '../../services/AIService';

const BUILD_A_BLUFF: GamePlugin = {
  id: 'build-a-bluff',
  name: 'Build a Bluff',
  description: 'Fool others with your fake answers. Find the truth among the lies.',
  minPlayers: 2,
  maxPlayers: 12,
  estimatedDurationMinutes: 15,
  usesAI: true,

  async setup(options: GameOptions): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('build-a-bluff', playerIds, Math.min(playerIds.length, 5));

    const state: BuildABluffGameState = {
      ...base,
      gameId: 'build-a-bluff',
      phase: 'instructions',
      question: '',
      answers: [],
      votes: {},
      realAnswerId: '',
      submittedBluffs: Object.fromEntries(playerIds.map((id) => [id, false])),
      phaseTimeoutMs: null,
    };

    return { newState: state };
  },

  async handleAction(state: any, playerId: any, action: any, data: any, options: any): Promise<StateTransition> {
    const s: BuildABluffGameState = {
      ...state,
      answers:        state.answers        ?? [],
      votes:          state.votes          ?? {},
      submittedBluffs: state.submittedBluffs ?? {},
      phaseTimeoutMs: state.phaseTimeoutMs ?? null,
      realAnswerId:   state.realAnswerId   ?? '',
      question:       state.question       ?? '',
    };

    switch (action) {
      case 'START_ROUND': {
        // Try AI first
        let question = '';
        let realAnswer = '';
        let aiBluff: string | null = null;

        if (options.aiSettings?.apiKey) {
          const packs = options.selectedPacks;
          const category = packs[Math.floor(Math.random() * packs.length)];
          const ai = await generateTriviaQuestion(options.aiSettings, category);
          if (ai) {
            question = ai.question;
            realAnswer = ai.answer;
            aiBluff = ai.bluff;
          }
        }

        // Fallback to curated trivia
        if (!question) {
          const entries = await getContentEntries(options.selectedPacks, 'trivia');
          const entry = pickRandom(entries) as { question: string; answer: string };
          question = entry.question;
          realAnswer = entry.answer;
        }

        const realAnswerId = Math.random().toString(36).substring(2, 10);
        const answers: BluffAnswer[] = [];

        if (aiBluff) {
          answers.push({
            id: Math.random().toString(36).substring(2, 10),
            text: aiBluff,
            authorId: 'ai',
          });
        }

        answers.push({ id: realAnswerId, text: realAnswer, authorId: 'real' });

        const playerIds = Object.keys(s.scores);

        return {
          newState: {
            ...s,
            phase: 'gameplay',
            question,
            answers: shuffle(answers), // shuffle early, will add bluffs as they come in
            realAnswerId,
            votes: {},
            submittedBluffs: Object.fromEntries(playerIds.map((id) => [id, false])),
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: 90_000, // 90s to submit bluffs
          },
        };
      }

      case 'SUBMIT_BLUFF': {
        const bluffText = (data.bluff as string).trim();
        if (!bluffText || s.submittedBluffs[playerId]) return { newState: s };

        const newAnswer: BluffAnswer = {
          id: Math.random().toString(36).substring(2, 10),
          text: bluffText,
          authorId: playerId,
        };

        const newAnswers = shuffle([...s.answers, newAnswer]);
        const newSubmitted = { ...s.submittedBluffs, [playerId]: true };
        const allSubmitted = Object.values(newSubmitted).every(Boolean);

        return {
          newState: {
            ...s,
            answers: newAnswers,
            submittedBluffs: newSubmitted,
            phase: allSubmitted ? 'voting' : s.phase,
            phaseTimeoutMs: allSubmitted ? 60_000 : s.phaseTimeoutMs,
            phaseStartedAt: allSubmitted ? Date.now() : s.phaseStartedAt,
          },
        };
      }

      case 'VOTE': {
        const answerId = data.answerId as string;
        const votes = { ...s.votes, [playerId]: answerId };
        const playerIds = Object.keys(s.scores);
        if (Object.keys(votes).length < playerIds.length) {
          return { newState: { ...s, votes } };
        }

        // Score: +2 for finding real answer, +1 for each player fooled by your bluff
        const newScores = { ...s.scores };
        const realAnswer = s.answers.find((a) => a.id === s.realAnswerId);

        Object.entries(votes).forEach(([voterId, selectedId]) => {
          if (selectedId === s.realAnswerId) {
            newScores[voterId] = (newScores[voterId] ?? 0) + 2;
          } else {
            // Find whose bluff this was
            const bluffAnswer = s.answers.find((a) => a.id === selectedId);
            if (bluffAnswer && bluffAnswer.authorId !== 'ai' && bluffAnswer.authorId !== 'real') {
              newScores[bluffAnswer.authorId] = (newScores[bluffAnswer.authorId] ?? 0) + 1;
            }
          }
        });

        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            votes,
            scores: newScores,
            phase: 'scoring',
            phaseTimeoutMs: 8000,
          },
        };
      }

      case 'NEXT_ROUND': {
        const playerIds = Object.keys(s.scores);
        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            phase: isLast ? 'winner' : 'round-start',
            round: isLast ? s.round : s.round + 1,
            question: '',
            answers: [],
            votes: {},
            realAnswerId: '',
            submittedBluffs: Object.fromEntries(playerIds.map((id) => [id, false])),
          },
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state, options): Promise<StateTransition> {
    const s = state as BuildABluffGameState;
    if (s.phase === 'gameplay') {
      // Force move to voting with whatever bluffs were submitted
      return { newState: { ...s, phase: 'voting', phaseTimeoutMs: 60_000, phaseStartedAt: Date.now() } };
    }
    if (s.phase === 'voting') {
      // Force scoring with votes as-is
      return {
        newState: {
          ...s,
          phase: 'scoring',
          phaseTimeoutMs: 8000,
          phaseStartedAt: Date.now(),
        },
      };
    }
    return { newState: s };
  },

  getPhaseTimeout(state) {
    return (state as BuildABluffGameState).phaseTimeoutMs ?? null;
  },

  isGameOver(state) {
    return state.phase === 'winner';
  },

  getFinalScores(state) {
    return state.scores;
  },
};

export default BUILD_A_BLUFF;
