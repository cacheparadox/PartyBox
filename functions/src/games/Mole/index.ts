import { GamePlugin, GameOptions, StateTransition, createBaseState, shuffle, pickRandom } from './GamePlugin';
import { MoleGameState } from '../../../shared/src/index';
import { getContentEntries } from '../services/ContentService';

const MOLE: GamePlugin = {
  id: 'mole',
  name: 'Mole',
  description: 'Most players share a word. One player unknowingly has a different one.',
  minPlayers: 3,
  maxPlayers: 10,
  estimatedDurationMinutes: 15,
  usesAI: false,

  async setup(options: GameOptions): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('mole', playerIds, 3);
    const entries = await getContentEntries(options.selectedPacks, 'word-category');

    // Find an entry that has a moleWord
    const validEntries = (entries as Array<{ word: string; category: string; moleWord?: string }>)
      .filter((e) => e.moleWord);
    const entry = validEntries.length > 0 ? pickRandom(validEntries) : {
      word: 'Elephant',
      category: 'Animals',
      moleWord: 'Mammoth',
    };

    const shuffled = shuffle(playerIds);
    const moleId = shuffled[0];

    const privateData: Record<string, Record<string, unknown>> = {};
    playerIds.forEach((id) => {
      privateData[id] = {
        word: id === moleId ? entry.moleWord : entry.word,
        isMole: false, // The mole doesn't know they are the mole!
      };
    });

    const state: MoleGameState = {
      ...base,
      gameId: 'mole',
      phase: 'instructions',
      category: entry.category,
      clueGrid: playerIds.map((id) => ({ playerId: id, clue: null })),
      votes: {},
      moleId,
      revealedWord: null,
      revealedMoleWord: null,
      phaseTimeoutMs: null,
    };

    return { newState: state, privateData };
  },

  async handleAction(state, playerId, action, data, options): Promise<StateTransition> {
    const s = state as MoleGameState;

    switch (action) {
      case 'START_ROUND':
        return { newState: { ...s, phase: 'gameplay', phaseStartedAt: Date.now() } };

      case 'SUBMIT_CLUE': {
        const newGrid = s.clueGrid.map((c) =>
          c.playerId === playerId ? { ...c, clue: data.clue as string } : c
        );
        const allSubmitted = newGrid.every((c) => c.clue !== null);
        return {
          newState: {
            ...s,
            clueGrid: newGrid,
            phase: allSubmitted ? 'voting' : s.phase,
            phaseTimeoutMs: allSubmitted ? 60_000 : null,
            phaseStartedAt: allSubmitted ? Date.now() : s.phaseStartedAt,
          },
        };
      }

      case 'VOTE': {
        const votes = { ...s.votes, [playerId]: data.targetId as string };
        if (Object.keys(votes).length < s.clueGrid.length) {
          return { newState: { ...s, votes } };
        }

        const tally: Record<string, number> = {};
        Object.values(votes).forEach((id) => { tally[id] = (tally[id] ?? 0) + 1; });
        const mostVoted = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
        const moleCaught = mostVoted === s.moleId;

        const entries = await getContentEntries(options.selectedPacks, 'word-category');
        const entry = entries.find((e) =>
          (e as { word: string }).word.toLowerCase() === (s.revealedWord ?? '').toLowerCase()
        );

        const newScores = { ...s.scores };
        if (moleCaught) {
          Object.keys(s.scores).forEach((id) => {
            if (id !== s.moleId) newScores[id] = (newScores[id] ?? 0) + 10;
          });
        } else {
          newScores[s.moleId] = (newScores[s.moleId] ?? 0) + 20;
        }

        return {
          newState: {
            ...s,
            votes,
            scores: newScores,
            revealedWord: (entry as { word: string } | undefined)?.word ?? '???',
            revealedMoleWord: (entry as { moleWord?: string } | undefined)?.moleWord ?? '???',
            phase: 'scoring',
            phaseTimeoutMs: 8000,
          },
        };
      }

      case 'NEXT_ROUND': {
        const playerIds = s.clueGrid.map((c) => c.playerId);
        const entries = await getContentEntries(options.selectedPacks, 'word-category');
        const validEntries = (entries as Array<{ word: string; category: string; moleWord?: string }>)
          .filter((e) => e.moleWord);
        const entry = validEntries.length > 0 ? pickRandom(validEntries) : {
          word: 'Tiger', category: 'Animals', moleWord: 'Leopard',
        };
        const shuffled = shuffle(playerIds);
        const newMoleId = shuffled[0];

        const privateData: Record<string, Record<string, unknown>> = {};
        playerIds.forEach((id) => {
          privateData[id] = { word: id === newMoleId ? entry.moleWord : entry.word, isMole: false };
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
            moleId: newMoleId,
            revealedWord: null,
            revealedMoleWord: null,
          },
          privateData,
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state, _options): Promise<StateTransition> {
    const s = state as MoleGameState;
    if (s.phase === 'gameplay') return { newState: { ...s, phase: 'voting', phaseTimeoutMs: 60_000 } };
    if (s.phase === 'voting') return { newState: { ...s, phase: 'scoring', phaseTimeoutMs: 8000 } };
    return { newState: s };
  },

  getPhaseTimeout(state) {
    return (state as MoleGameState).phaseTimeoutMs;
  },

  isGameOver(state) {
    return state.phase === 'winner';
  },

  getFinalScores(state) {
    return state.scores;
  },
};

export default MOLE;
