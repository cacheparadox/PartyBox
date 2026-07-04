import type { GamePlugin, GameOptions, StateTransition } from '../GamePlugin';
import { createBaseState, pickRandom } from '../GamePlugin';
import type { RGWGameState } from '../../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';
import { generateIdentity } from '../../services/AIService';

const REVERSE_GUESS_WHO: GamePlugin = {
  id: 'reverse-guess-who',
  name: 'Reverse Guess Who',
  description: 'Put your phone on your forehead! Everyone gets a secret celebrity identity and must ask yes/no questions to figure out who they are.',
  minPlayers: 2,
  maxPlayers: 12,
  estimatedDurationMinutes: 10,
  usesAI: true,

  async setup(options: any): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('reverse-guess-who', playerIds, playerIds.length); // 1 round per player effectively, or just default rounds

    const state: RGWGameState = {
      ...base,
      gameId: 'reverse-guess-who',
      phase: 'instructions',
      identities: {},
      completed: {},
      phaseTimeoutMs: null,
    };

    return { newState: state };
  },

  async handleAction(state: any, playerId: any, action: any, data: any, options: any): Promise<StateTransition> {
    const s = {
      ...state,
      identities: state.identities ?? {},
      completed: state.completed ?? {},
      phaseTimeoutMs: state.phaseTimeoutMs ?? null,
    } as RGWGameState;

    switch (action) {
      case 'START_ROUND': {
        const playerIds = Object.keys(s.scores);
        const identities: Record<string, { name: string; category: string }> = {};
        
        // Fetch pool of identities
        const entries = await getContentEntries(options.selectedPacks, 'identity');
        const cats = ['Actors', 'Musicians', 'Athletes', 'Politicians', 'Comedians', 'Fictional Characters'];

        for (const pid of playerIds) {
          let identity = { name: '', category: '', nationality: '', era: '', hintTags: [] as string[] };
          
          if (options.aiSettings?.apiKey && entries.length < 5) {
            const ai = await generateIdentity(options.aiSettings, pickRandom(cats));
            if (ai) identity = ai;
          }

          if (!identity.name) {
            if (entries.length > 0) {
               identity = pickRandom(entries) as any;
            } else {
               identity = { name: 'Brad Pitt', category: 'Actors', nationality: 'American', era: '2000s', hintTags: [] };
            }
          }

          identities[pid] = { name: identity.name, category: identity.category || 'Celebrity' };
        }

        return {
          newState: {
            ...s,
            phase: 'countdown',
            identities,
            completed: {},
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: 10000, // 10 second countdown
          },
        };
      }

      case 'COMPLETE_GUESS': {
        if (s.phase !== 'gameplay') return { newState: s };
        
        const result = data.result as 'correct' | 'pass';
        const newCompleted = { ...s.completed, [playerId]: result };
        const newScores = { ...s.scores };

        if (result === 'correct') {
          newScores[playerId] = (newScores[playerId] ?? 0) + 10;
        }

        const isRoundOver = Object.keys(newCompleted).length === Object.keys(s.scores).length;

        return {
          newState: {
            ...s,
            completed: newCompleted,
            scores: newScores,
            phase: isRoundOver ? 'scoring' : s.phase,
            phaseTimeoutMs: isRoundOver ? null : s.phaseTimeoutMs,
          }
        };
      }

      case 'NEXT_ROUND': {
        const isLast = s.round >= s.maxRounds;
        return {
          newState: {
            ...s,
            phase: isLast ? 'winner' : 'round-start',
            round: isLast ? s.round : s.round + 1,
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: isLast ? null : 1000, // small delay before auto-generating
          },
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state: any, options: any): Promise<StateTransition> {
    const s = state as RGWGameState;
    
    if (s.phase === 'countdown') {
      return { newState: { ...s, phase: 'gameplay', phaseTimeoutMs: null, phaseStartedAt: Date.now() } };
    }
    
    if (s.phase === 'round-start') {
      // Auto-trigger START_ROUND
      return this.handleAction(state, Object.keys(state.scores)[0], 'START_ROUND', {}, options);
    }
    
    return { newState: s };
  },

  getPhaseTimeout: (state: any) => {
    return (state as RGWGameState).phaseTimeoutMs ?? null;
  },

  isGameOver: (state: any) => {
    return state.phase === 'winner';
  },

  getFinalScores: (state: any) => {
    return state.scores;
  },
};

export default REVERSE_GUESS_WHO;
