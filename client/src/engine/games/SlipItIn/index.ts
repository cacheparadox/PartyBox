import type { GamePlugin, GameOptions, StateTransition } from '../GamePlugin';
import { createBaseState, shuffle, pickRandom } from '../GamePlugin';
import type { SlipItInGameState, SlipItInPhrase } from '../../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';


const PHRASES_PER_PLAYER = 3;

function generatePhraseId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const SLIP_IT_IN: GamePlugin = {
  id: 'slip-it-in',
  name: 'Slip It In',
  description: 'Secretly weave phrases into conversation. Catch others doing the same.',
  minPlayers: 2,
  maxPlayers: 12,
  estimatedDurationMinutes: 20,
  usesAI: false,

  async setup(options: any): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('slip-it-in', playerIds, 1);
    const allEntries = await getContentEntries(options.selectedPacks, 'phrase');
    const shuffledPhrases = shuffle(allEntries);

    const privateData: Record<string, Record<string, unknown>> = {};
    const playerPhraseCount: Record<string, number> = {};

    playerIds.forEach((playerId, idx) => {
      const phrases: SlipItInPhrase[] = shuffledPhrases
        .slice(idx * PHRASES_PER_PLAYER, (idx + 1) * PHRASES_PER_PLAYER)
        .map((e) => ({
          id: generatePhraseId(),
          phrase: (e as { phrase: string }).phrase,
          completed: false,
        }));

      privateData[playerId] = { phrases };
      playerPhraseCount[playerId] = PHRASES_PER_PLAYER;
    });

    const state: SlipItInGameState = {
      ...base,
      gameId: 'slip-it-in',
      phase: 'instructions',
      playerPhraseCount,
      accusationLog: [],
      winnerId: null,
      phaseTimeoutMs: null,
    };

    return { newState: state, privateData };
  },

  async handleAction(state: any, playerId: any, action: any, data: any, options: any): Promise<StateTransition> {
    const s = state as SlipItInGameState;

    switch (action) {
      case 'START_GAME':
        return { newState: { ...s, phase: 'gameplay' } };

      case 'ACCUSE': {
        const accusedId = data.accusedId as string;
        const phraseId = data.phraseId as string;

        // The actual validation happens client-side via private data reveal
        // For now, host confirms correct/incorrect
        return { newState: s };
      }

      case 'CONFIRM_ACCUSATION': {
        // Host or server confirms whether accusation was correct
        const { accuserId, accusedId, phraseId, correct } = data as {
          accuserId: string;
          accusedId: string;
          phraseId: string;
          correct: boolean;
        };

        const newCounts = { ...s.playerPhraseCount };
        const newLog = [
          ...s.accusationLog,
          { accuserId, accusedId, phraseId, correct, timestamp: Date.now() },
        ];

        const privateData: Record<string, Record<string, unknown>> = {};

        if (correct) {
          // Remove phrase from accused, draw new one for accused
          // (new phrase drawn from remaining pool — handled via private data update)
          newCounts[accusedId] = Math.max(0, (newCounts[accusedId] ?? 0) - 1);

          // Award score to accuser
          const newScores = { ...s.scores };
          newScores[accuserId] = (newScores[accuserId] ?? 0) + 10;

          // Check win condition
          const winner = Object.entries(newCounts).find(([, count]) => count === 0);

          return {
            newState: {
              ...s,
              scores: newScores,
              playerPhraseCount: newCounts,
              accusationLog: newLog,
              winnerId: winner ? winner[0] : null,
              phase: winner ? 'winner' : s.phase,
            },
            privateData,
          };
        } else {
          // Incorrect accusation — accuser gets an extra phrase
          const allEntries = await getContentEntries(options.selectedPacks, 'phrase');
          const newPhrase = pickRandom(allEntries) as { phrase: string };
          newCounts[accuserId] = (newCounts[accuserId] ?? 0) + 1;

          privateData[accuserId] = {
            addPhrase: {
              id: generatePhraseId(),
              phrase: newPhrase.phrase,
              completed: false,
            },
          };

          return {
            newState: {
              ...s,
              playerPhraseCount: newCounts,
              accusationLog: newLog,
            },
            privateData,
          };
        }
      }

      case 'COMPLETE_PHRASE': {
        const phraseId = data.phraseId as string;
        const newCounts = { ...s.playerPhraseCount };
        newCounts[playerId] = Math.max(0, (newCounts[playerId] ?? 0) - 1);

        const winner = newCounts[playerId] === 0 ? playerId : null;

        const newScores = { ...s.scores };
        if (winner) {
          newScores[winner] = (newScores[winner] ?? 0) + 50;
        }

        return {
          newState: {
            ...s,
            playerPhraseCount: newCounts,
            scores: newScores,
            winnerId: winner,
            phase: winner ? 'winner' : s.phase,
          },
          privateData: {
            [playerId]: { completedPhraseId: phraseId },
          },
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state: any, _options: any): Promise<StateTransition> {
    return { newState: state };
  },

  getPhaseTimeout: (_state: any) => {
    return null; // No time limit — game ends when someone completes all phrases
  },

  isGameOver: (state: any) => {
    return (state as SlipItInGameState).winnerId !== null || state.phase === 'winner';
  },

  getFinalScores: (state: any) => {
    return state.scores;
  },
};

export default SLIP_IT_IN;

