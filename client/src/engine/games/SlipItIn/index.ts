import type { GamePlugin, GameOptions, StateTransition } from '../GamePlugin';
import { createBaseState, shuffle } from '../GamePlugin';
import type { SlipItInGameState, SlipItInPhrase, SlipItInClaim, SlipItInVote } from '../../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';

const PHRASES_PER_PLAYER = 5;

function generateId(): string {
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

    let deckIndex = 0;
    playerIds.forEach((playerId) => {
      const phrases: SlipItInPhrase[] = shuffledPhrases
        .slice(deckIndex, deckIndex + PHRASES_PER_PLAYER)
        .map((e: any) => ({
          id: generateId(),
          phrase: e.phrase || e.text || 'Something went wrong',
          completed: false,
        }));
      deckIndex += PHRASES_PER_PLAYER;
      privateData[playerId] = { phrases };
      playerPhraseCount[playerId] = PHRASES_PER_PLAYER;
    });

    const phraseDeck = shuffledPhrases.slice(deckIndex).map((e: any) => ({
      id: generateId(),
      phrase: e.phrase || e.text || 'Something went wrong',
      completed: false,
    }));

    const state: SlipItInGameState = {
      ...base,
      gameId: 'slip-it-in',
      phase: 'instructions',
      honorRules: true,
      phraseDeck,
      playerPhraseCount,
      activeClaims: {},
      activeVotes: {},
      accusationLog: [],
      winnerId: null,
      phaseTimeoutMs: null,
    };

    return { newState: state, privateData };
  },

  async handleAction(state: any, playerId: string, action: string, data: any, options: any): Promise<StateTransition> {
    // Normalize: old game states from Firebase may be missing new fields
    const s: SlipItInGameState = {
      ...state,
      activeClaims: state.activeClaims ?? {},
      activeVotes:  state.activeVotes  ?? {},
      phraseDeck:   state.phraseDeck   ?? [],
      honorRules:   state.honorRules   ?? true,
      accusationLog: state.accusationLog ?? [],
    };

    switch (action) {
      case 'START_GAME':
        return { newState: { ...s, phase: 'gameplay' } };

      case 'TOGGLE_HONOR_RULES':
        return { newState: { ...s, honorRules: !s.honorRules } };

      case 'CLAIM_PHRASE': {
        if (s.activeClaims[playerId]) return { newState: s };
        
        const { phraseId, phrase } = data as { phraseId: string; phrase: string };
        const newClaims = { ...s.activeClaims };
        newClaims[playerId] = {
          phraseId,
          phrase,
          startedAt: Date.now(),
          pausedAt: null,
          accusedBy: null,
        };
        return { newState: { ...s, activeClaims: newClaims } };
      }

      case 'ACCUSE_PLAYER': {
        const { accusedId } = data as { accusedId: string };
        const claim = s.activeClaims[accusedId];

        const privateData: Record<string, Record<string, unknown>> = {};

        if (!claim || claim.pausedAt !== null) {
          const newDeck = [...s.phraseDeck];
          const penaltyPhrase = newDeck.shift();
          
          const newCounts = { ...s.playerPhraseCount };
          newCounts[playerId] = (newCounts[playerId] || 0) + 1;

          const newLog = [
            ...s.accusationLog,
            { accuserId: playerId, accusedId, correct: false, timestamp: Date.now() }
          ];

          if (penaltyPhrase) {
            privateData[playerId] = { 
              newPhrase: penaltyPhrase, 
              _action: 'ADD_PHRASE' 
            };
          }

          return { 
            newState: { 
              ...s, 
              phraseDeck: newDeck, 
              playerPhraseCount: newCounts,
              accusationLog: newLog
            }, 
            privateData 
          };
        }

        const newClaims = { ...s.activeClaims };
        newClaims[accusedId] = {
          ...claim,
          pausedAt: Date.now(),
          accusedBy: playerId
        };

        return { newState: { ...s, activeClaims: newClaims } };
      }

      case 'RESOLVE_ACCUSATION': {
        const { correct } = data as { correct: boolean };
        const claim = s.activeClaims[playerId];
        if (!claim || claim.accusedBy === null || claim.pausedAt === null) return { newState: s };

        const accuserId = claim.accusedBy;
        const newClaims = { ...s.activeClaims };
        const newLog = [
          ...s.accusationLog,
          { accuserId, accusedId: playerId, correct, timestamp: Date.now() }
        ];

        const privateData: Record<string, Record<string, unknown>> = {};

        if (correct) {
          delete newClaims[playerId];
          
          const newDeck = [...s.phraseDeck];
          const replacementPhrase = newDeck.shift();
          if (replacementPhrase) {
            privateData[playerId] = {
              phraseIdToRemove: claim.phraseId,
              newPhrase: replacementPhrase,
              _action: 'REPLACE_PHRASE'
            };
          }
          
          return {
            newState: { ...s, activeClaims: newClaims, phraseDeck: newDeck, accusationLog: newLog },
            privateData
          };
        } else {
          const newDeck = [...s.phraseDeck];
          const penaltyPhrase = newDeck.shift();
          
          const newCounts = { ...s.playerPhraseCount };
          newCounts[accuserId] = (newCounts[accuserId] || 0) + 1;

          if (penaltyPhrase) {
            privateData[accuserId] = { 
              newPhrase: penaltyPhrase, 
              _action: 'ADD_PHRASE' 
            };
          }

          const elapsedPaused = Date.now() - claim.pausedAt;
          newClaims[playerId] = {
            ...claim,
            startedAt: claim.startedAt + elapsedPaused,
            pausedAt: null,
            accusedBy: null
          };

          return {
            newState: {
              ...s,
              activeClaims: newClaims,
              phraseDeck: newDeck,
              playerPhraseCount: newCounts,
              accusationLog: newLog
            },
            privateData
          };
        }
      }

      case 'CLAIM_TIMEOUT': {
        const { claimPlayerId } = data as { claimPlayerId: string };
        const claim = s.activeClaims[claimPlayerId];
        if (!claim) return { newState: s };

        const newClaims = { ...s.activeClaims };
        delete newClaims[claimPlayerId];

        if (s.honorRules) {
          const newCounts = { ...s.playerPhraseCount };
          newCounts[claimPlayerId] = Math.max(0, (newCounts[claimPlayerId] || 0) - 1);

          let nextPhase = s.phase;
          let winnerId = s.winnerId;

          if (newCounts[claimPlayerId] === 0) {
            nextPhase = 'winner';
            winnerId = claimPlayerId;
          }

          const privateData: Record<string, Record<string, unknown>> = {
            [claimPlayerId]: { phraseIdToComplete: claim.phraseId, _action: 'COMPLETE_PHRASE' }
          };

          return {
            newState: { 
              ...s, 
              activeClaims: newClaims, 
              playerPhraseCount: newCounts, 
              phase: nextPhase, 
              winnerId 
            },
            privateData
          };
        } else {
          const newVotes = { ...s.activeVotes };
          newVotes[claimPlayerId] = {
            phraseId: claim.phraseId,
            phrase: claim.phrase,
            votes: {}
          };
          return { newState: { ...s, activeClaims: newClaims, activeVotes: newVotes } };
        }
      }

      case 'VOTE_CLAIM': {
        const { targetPlayerId, vote } = data as { targetPlayerId: string, vote: boolean };
        const activeVote = s.activeVotes[targetPlayerId];
        if (!activeVote || targetPlayerId === playerId) return { newState: s };

        activeVote.votes[playerId] = vote;
        
        const activePlayers = Object.keys(options.players).filter(p => options.players[p].isConnected);
        const voters = activePlayers.filter(p => p !== targetPlayerId);
        const totalVotes = Object.keys(activeVote.votes).length;

        if (totalVotes >= voters.length) {
          const yesVotes = Object.values(activeVote.votes).filter(v => v).length;
          const noVotes = totalVotes - yesVotes;
          
          const newVotes = { ...s.activeVotes };
          delete newVotes[targetPlayerId];

          if (yesVotes > noVotes) {
            const newCounts = { ...s.playerPhraseCount };
            newCounts[targetPlayerId] = Math.max(0, (newCounts[targetPlayerId] || 0) - 1);

            let nextPhase = s.phase;
            let winnerId = s.winnerId;

            if (newCounts[targetPlayerId] === 0) {
              nextPhase = 'winner';
              winnerId = targetPlayerId;
            }

            const privateData: Record<string, Record<string, unknown>> = {
              [targetPlayerId]: { phraseIdToComplete: activeVote.phraseId, _action: 'COMPLETE_PHRASE' }
            };

            return {
              newState: { 
                ...s, 
                activeVotes: newVotes, 
                playerPhraseCount: newCounts, 
                phase: nextPhase, 
                winnerId 
              },
              privateData
            };
          } else {
            return { newState: { ...s, activeVotes: newVotes } };
          }
        }

        return { newState: s };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state: any, _options: any): Promise<StateTransition> {
    return { newState: state };
  },

  getPhaseTimeout: (_state: any) => null,
  isGameOver: (state: any) => (state as SlipItInGameState).winnerId !== null || state.phase === 'winner',

  getFinalScores: (state: any) => {
    return state.scores;
  },
};

export default SLIP_IT_IN;

