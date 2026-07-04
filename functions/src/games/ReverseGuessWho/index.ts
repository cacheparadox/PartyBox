import { GamePlugin, GameOptions, StateTransition, createBaseState, shuffle, pickRandom } from './GamePlugin';
import { RGWGameState, RGWQuestion } from '../../../shared/src/index';
import { getContentEntries } from '../services/ContentService';
import { generateIdentity } from '../services/AIService';
import * as crypto from 'crypto';

const SCORE_TABLE = [20, 16, 13, 10, 8, 6, 5, 4, 3, 2]; // points by question count

const REVERSE_GUESS_WHO: GamePlugin = {
  id: 'reverse-guess-who',
  name: 'Reverse Guess Who',
  description: 'One player holds a secret identity. Others ask yes/no questions to find out who.',
  minPlayers: 3,
  maxPlayers: 12,
  estimatedDurationMinutes: 15,
  usesAI: true,

  async setup(options: GameOptions): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('reverse-guess-who', playerIds, playerIds.length);

    const state: RGWGameState = {
      ...base,
      gameId: 'reverse-guess-who',
      phase: 'instructions',
      identityHolderId: '',
      identityCategory: '',
      questions: [],
      skipVotes: {},
      skipsUsed: 0,
      buzzerId: null,
      buzzerGuess: null,
      revealed: false,
      revealedIdentity: null,
      phaseTimeoutMs: null,
    };

    return { newState: state };
  },

  async handleAction(state, playerId, action, data, options): Promise<StateTransition> {
    const s = state as RGWGameState;

    switch (action) {
      case 'START_ROUND': {
        const playerIds = Object.keys(s.scores);
        // Rotate identity holder each round
        const holderIndex = (s.round - 1) % playerIds.length;
        const identityHolderId = playerIds[holderIndex];

        // Get identity (AI or curated)
        let identity = { name: '', category: 'Actors', nationality: 'American', era: '2000s', hintTags: [] as string[] };
        const entries = await getContentEntries(options.selectedPacks, 'identity');

        if (options.aiSettings?.apiKey && entries.length < 5) {
          const cats = ['Actors', 'Musicians', 'Athletes', 'Politicians', 'Comedians'];
          const cat = pickRandom(cats);
          const ai = await generateIdentity(options.aiSettings, cat);
          if (ai) identity = ai;
        }

        if (!identity.name) {
          const entry = pickRandom(entries) as {
            name: string; category: string; nationality: string; era: string; hintTags: string[];
          };
          identity = entry;
        }

        const privateData: Record<string, Record<string, unknown>> = {
          [identityHolderId]: { identity: identity.name },
        };

        return {
          newState: {
            ...s,
            phase: 'gameplay',
            identityHolderId,
            identityCategory: identity.category,
            questions: [],
            skipVotes: {},
            buzzerId: null,
            buzzerGuess: null,
            revealed: false,
            revealedIdentity: null,
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: null,
          },
          privateData,
        };
      }

      case 'ASK_QUESTION': {
        const question: RGWQuestion = {
          id: crypto.randomBytes(4).toString('hex'),
          askerId: playerId,
          text: data.question as string,
          answer: null,
          answeredAt: null,
        };
        return { newState: { ...s, questions: [...s.questions, question] } };
      }

      case 'ANSWER_QUESTION': {
        if (playerId !== s.identityHolderId) return { newState: s };
        const questionId = data.questionId as string;
        const answer = data.answer as 'yes' | 'no';

        const updated = s.questions.map((q) =>
          q.id === questionId ? { ...q, answer, answeredAt: Date.now() } : q
        );
        return { newState: { ...s, questions: updated } };
      }

      case 'VOTE_SKIP': {
        if (playerId === s.identityHolderId) return { newState: s };
        const skipVotes = { ...s.skipVotes, [playerId]: true };
        const nonHolderCount = Object.keys(s.scores).length - 1;
        const skipApproved = Object.keys(skipVotes).length > nonHolderCount / 2;

        if (!skipApproved) return { newState: { ...s, skipVotes } };

        // Skip — draw new identity
        const entries = await getContentEntries(options.selectedPacks, 'identity');
        let identity = { name: '', category: 'Actors', nationality: 'American', era: '2000s', hintTags: [] as string[] };

        if (options.aiSettings?.apiKey) {
          const cats = ['Actors', 'Musicians', 'Athletes', 'Politicians'];
          const ai = await generateIdentity(options.aiSettings, pickRandom(cats));
          if (ai) identity = ai;
        }
        if (!identity.name && entries.length > 0) {
          identity = pickRandom(entries) as typeof identity;
        }

        const privateData = identity.name ? { [s.identityHolderId]: { identity: identity.name } } : undefined;

        return {
          newState: {
            ...s,
            identityCategory: identity.category || s.identityCategory,
            questions: [],
            skipVotes: {},
            skipsUsed: s.skipsUsed + 1,
            buzzerId: null,
            buzzerGuess: null,
          },
          privateData,
        };
      }

      case 'BUZZ': {
        if (s.buzzerId || playerId === s.identityHolderId) return { newState: s };
        return { newState: { ...s, buzzerId: playerId, phaseTimeoutMs: 30_000, phaseStartedAt: Date.now() } };
      }

      case 'SUBMIT_GUESS': {
        if (playerId !== s.buzzerId) return { newState: s };
        return { newState: { ...s, buzzerGuess: data.guess as string } };
      }

      case 'CONFIRM_GUESS': {
        // Host confirms correct/wrong
        const correct = data.correct as boolean;
        const newScores = { ...s.scores };
        const questionCount = s.questions.filter((q) => q.answer !== null).length;

        if (correct && s.buzzerId) {
          const score = SCORE_TABLE[Math.min(questionCount, SCORE_TABLE.length - 1)];
          newScores[s.buzzerId] = (newScores[s.buzzerId] ?? 0) + score;
        }

        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            scores: newScores,
            revealed: true,
            phase: 'scoring',
            phaseTimeoutMs: 8000,
          },
        };
      }

      case 'NEXT_ROUND': {
        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            phase: isLast ? 'winner' : 'round-start',
            round: isLast ? s.round : s.round + 1,
          },
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state, _options): Promise<StateTransition> {
    const s = state as RGWGameState;
    if (s.phase === 'voting') {
      return { newState: { ...s, phase: 'scoring', phaseTimeoutMs: 8000 } };
    }
    return { newState: s };
  },

  getPhaseTimeout(state) {
    return (state as RGWGameState).phaseTimeoutMs;
  },

  isGameOver(state) {
    return state.phase === 'winner';
  },

  getFinalScores(state) {
    return state.scores;
  },
};

export default REVERSE_GUESS_WHO;
