import type { GamePlugin } from '../GamePlugin';
import { createBaseState, shuffle, pickRandom } from '../GamePlugin';
import type { ChameleonGameState } from '../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';

const CLUE_TIMEOUT_MS = 30_000; // 30 seconds per clue
const VOTE_TIMEOUT_MS = 60_000;

const CHAMELEON: GamePlugin = {
  id: 'chameleon',
  name: 'Chameleon',
  description: 'Everyone knows the word except one. The chameleon must blend in.',
  minPlayers: 3,
  maxPlayers: 10,
  estimatedDurationMinutes: 15,
  usesAI: false,

  async setup(options: GameOptions): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('chameleon', playerIds, 3);
    const entries = await getContentEntries(options.selectedPacks, 'word-category');
    const entry = pickRandom(entries) as { word: string; category: string };

    const shuffledPlayers = shuffle(playerIds);
    const chameleonId = shuffledPlayers[0];

    const privateData: Record<string, Record<string, unknown>> = {};
    playerIds.forEach((id) => {
      privateData[id] = id === chameleonId ? { role: 'chameleon', word: null } : { role: 'player', word: entry.word };
    });

    const state: ChameleonGameState = {
      ...base,
      gameId: 'chameleon',
      phase: 'instructions',
      category: entry.category,
      clueGrid: playerIds.map((id) => ({ playerId: id, clue: null })),
      votes: {},
      chameleonId,
      revealedWord: null,
      chameleonGuess: null,
      phaseTimeoutMs: null,
    };

    return { newState: state, privateData };
  },

  async handleAction(state: any, playerId: any, action: any, data: any, options: any): Promise<StateTransition> {
    const s = state as ChameleonGameState;

    switch (action) {
      case 'START_ROUND':
        return { newState: { ...s, phase: 'gameplay', phaseStartedAt: Date.now() } };

      case 'SUBMIT_CLUE': {
        const clue = data.clue as string;
        const newGrid = s.clueGrid.map((c) => (c.playerId === playerId ? { ...c, clue } : c));
        const allSubmitted = newGrid.every((c) => c.clue !== null);

        return {
          newState: {
            ...s,
            clueGrid: newGrid,
            phase: allSubmitted ? 'voting' : s.phase,
            phaseTimeoutMs: allSubmitted ? VOTE_TIMEOUT_MS : CLUE_TIMEOUT_MS,
            phaseStartedAt: allSubmitted ? Date.now() : s.phaseStartedAt,
          },
        };
      }

      case 'VOTE': {
        const votes = { ...s.votes, [playerId]: data.targetId as string };
        const playerCount = s.clueGrid.length;
        if (Object.keys(votes).length < playerCount) {
          return { newState: { ...s, votes } };
        }

        // Tally votes
        const tally: Record<string, number> = {};
        Object.values(votes).forEach((id) => { tally[id] = (tally[id] ?? 0) + 1; });
        const mostVoted = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

        const newScores = { ...s.scores };

        if (mostVoted === s.chameleonId) {
          // Chameleon caught — chameleon gets one last chance to guess word
          return {
            newState: {
              ...s,
              votes,
              phase: 'voting', // chameleon guesses
              phaseTimeoutMs: 30_000,
            },
          };
        } else {
          // Chameleon escapes — chameleon scores, others lose points
          newScores[s.chameleonId] = (newScores[s.chameleonId] ?? 0) + 20;
          return {
            newState: {
              ...s,
              votes,
              scores: newScores,
              revealedWord: null,
              phase: 'scoring',
              phaseTimeoutMs: 6000,
            },
          };
        }
      }

      case 'CHAMELEON_GUESS': {
        if (playerId !== s.chameleonId) return { newState: s };
        const guess = data.guess as string;
        const entries = await getContentEntries(options.selectedPacks, 'word-category');
        const entry = entries.find((e) => (e as { word: string }).word === s.revealedWord ?? '');
        const correct = entry && guess.toLowerCase().trim() === (entry as { word: string }).word.toLowerCase().trim();

        const newScores = { ...s.scores };
        if (correct) {
          newScores[s.chameleonId] = (newScores[s.chameleonId] ?? 0) + 10;
        } else {
          // Correct word revealed, non-chameleons score
          Object.keys(s.scores).forEach((id) => {
            if (id !== s.chameleonId) {
              newScores[id] = (newScores[id] ?? 0) + 5;
            }
          });
        }

        return {
          newState: {
            ...s,
            chameleonGuess: guess,
            scores: newScores,
            phase: 'scoring',
            phaseTimeoutMs: 6000,
          },
        };
      }

      case 'NEXT_ROUND': {
        const entries = await getContentEntries(options.selectedPacks, 'word-category');
        const entry = pickRandom(entries) as { word: string; category: string };
        const playerIds = s.clueGrid.map((c) => c.playerId);
        const shuffled = shuffle(playerIds);
        const newChameleon = shuffled[0];

        const privateData: Record<string, Record<string, unknown>> = {};
        playerIds.forEach((id) => {
          privateData[id] = id === newChameleon
            ? { role: 'chameleon', word: null }
            : { role: 'player', word: entry.word };
        });

        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            phase: isLast ? 'winner' : 'round-start',
            round: isLast ? s.round : s.round + 1,
            category: entry.category,
            clueGrid: playerIds.map((id) => ({ playerId: id, clue: null })),
            votes: {},
            chameleonId: newChameleon,
            revealedWord: null,
            chameleonGuess: null,
          },
          privateData,
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state: any, _options: any): Promise<StateTransition> {
    const s = state as ChameleonGameState;
    if (s.phase === 'gameplay') {
      return { newState: { ...s, phase: 'voting', phaseTimeoutMs: VOTE_TIMEOUT_MS, phaseStartedAt: Date.now() } };
    }
    if (s.phase === 'voting') {
      return { newState: { ...s, phase: 'scoring', phaseTimeoutMs: 6000, phaseStartedAt: Date.now() } };
    }
    return { newState: s };
  },

  getPhaseTimeout(state) {
    return (state as ChameleonGameState).phaseTimeoutMs;
  },

  isGameOver(state) {
    return state.phase === 'winner';
  },

  getFinalScores(state) {
    return state.scores;
  },
};

export default CHAMELEON;
