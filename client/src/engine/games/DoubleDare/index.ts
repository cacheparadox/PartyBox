import type { GamePlugin, GameOptions, StateTransition } from '../GamePlugin';
import { createBaseState, shuffle, pickRandom } from '../GamePlugin';
import type { DoubleDareGameState } from '../../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';

const TIME_LIMIT_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5 to 60 seconds

const DOUBLE_DARE: GamePlugin = {
  id: 'double-dare',
  name: 'Double Dare',
  description: 'Bid how many items you can name. Dare someone to prove it.',
  minPlayers: 2,
  maxPlayers: 12,
  estimatedDurationMinutes: 15,
  usesAI: false,

  async setup(options: any): Promise<StateTransition> {
    const playerIds = Object.keys(options.players);
    const base = createBaseState('double-dare', playerIds, playerIds.length);
    const entries = await getContentEntries(options.selectedPacks, 'topic');
    const topicEntry = entries.length > 0 ? pickRandom(entries) : { topic: 'Animals', difficulty: 1 };
    const topicString = (topicEntry as any).topic || (topicEntry as any).text || 'Animals';
    const topicDiff = (topicEntry as any).difficulty ?? 1;

    const state: DoubleDareGameState = {
      ...base,
      phase: 'instructions',
      gameId: 'double-dare',
      topic: topicString,
      difficulty: topicDiff as 1 | 2 | 3,
      roundTimeLimit: pickRandom(TIME_LIMIT_OPTIONS) as number,
      currentBid: null,
      doubledBy: null,
      answers: [],
      validationVotes: {},
      currentAnswerIndex: 0,
      biddingOrder: shuffle(playerIds),
      biddingIndex: 0,
      phaseTimeoutMs: null,
    };

    return { newState: state };
  },

  async handleAction(state: any, playerId: any, action: any, data: any, options: any): Promise<StateTransition> {
    const s: DoubleDareGameState = {
      ...state,
      currentBid:      state.currentBid      ?? null,
      doubledBy:       state.doubledBy       ?? null,
      answers:         state.answers         ?? [],
      validationVotes: state.validationVotes ?? {},
      phaseTimeoutMs:  state.phaseTimeoutMs  ?? null,
      biddingOrder:    state.biddingOrder    ?? [],
    };

    switch (action) {
      case 'START_ROUND': {
        // Host advances from instructions → bidding
        const entries = await getContentEntries(options.selectedPacks, 'topic');
        const topicEntry = entries.length > 0 ? pickRandom(entries) : { topic: 'Animals', difficulty: 1 };
        const topicString = (topicEntry as any).topic || (topicEntry as any).text || 'Animals';
        const topicDiff = (topicEntry as any).difficulty ?? 1;
        return {
          newState: {
            ...s,
            phase: 'gameplay',
            topic: topicString,
            difficulty: topicDiff as 1 | 2 | 3,
            roundTimeLimit: pickRandom(TIME_LIMIT_OPTIONS) as number,
            currentBid: null,
            doubledBy: null,
            answers: [],
            validationVotes: {},
            currentAnswerIndex: 0,
            phaseStartedAt: Date.now(),
          },
        };
      }

      case 'SUBMIT_BID': {
        const currentBidder = s.biddingOrder[s.biddingIndex];
        if (playerId !== currentBidder) return { newState: s };

        const newCount = data.count as number;
        if (s.currentBid && newCount <= s.currentBid.count) {
          return { newState: s }; // Bid must be higher
        }

        const nextIndex = (s.biddingIndex + 1) % s.biddingOrder.length;

        return {
          newState: {
            ...s,
            biddingIndex: nextIndex,
            currentBid: {
              playerId,
              count: newCount,
            },
          },
        };
      }

      case 'PASS_BID': {
        const currentBidder = s.biddingOrder[s.biddingIndex];
        if (playerId !== currentBidder) return { newState: s };

        const newOrder = s.biddingOrder.filter(id => id !== playerId);

        // If only 1 player remains and a bid was already made → bidder must perform
        if (newOrder.length === 1 && s.currentBid) {
          return {
            newState: {
              ...s,
              biddingOrder: newOrder,
              phase: 'performing',  // dedicated performing phase flag
              phaseStartedAt: Date.now(),
              phaseTimeoutMs: s.roundTimeLimit * 1000,
            }
          };
        }

        // If everyone passed with no bid → skip to next round automatically
        if (newOrder.length === 0 && !s.currentBid) {
          const allIds = Object.keys(options.players);
          const nextBidding = (s.biddingIndex + 1) % allIds.length;
          return {
            newState: {
              ...s,
              phase: 'scoring',
              biddingOrder: shuffle(allIds),
              biddingIndex: nextBidding,
              currentBid: null,
              phaseTimeoutMs: 3000,
            }
          };
        }

        const nextIndex = s.biddingIndex % Math.max(1, newOrder.length);

        return {
          newState: {
            ...s,
            biddingOrder: newOrder,
            biddingIndex: nextIndex,
          }
        };
      }

      case 'DOUBLE_DARE': {
        if (!s.currentBid) return { newState: s };
        return {
          newState: {
            ...s,
            doubledBy: playerId,
            phase: 'performing',
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: s.roundTimeLimit * 1000,
          },
        };
      }

      case 'ACCEPT_BID': {
        // Bidder accepts their own bid (no double dare issued)
        if (!s.currentBid || s.currentBid.playerId !== playerId) return { newState: s };
        return {
          newState: {
            ...s,
            phase: 'performing',
            phaseStartedAt: Date.now(),
            phaseTimeoutMs: s.roundTimeLimit * 1000,
          },
        };
      }

      case 'SUBMIT_ANSWER': {
        return {
          newState: {
            ...s,
            answers: [...s.answers, data.answer as string],
          },
        };
      }

      case 'VOTE_ANSWER': {
        // Group validates current answer
        const votes = { ...s.validationVotes, [playerId]: data.valid as boolean };
        const playerCount = Object.keys(options.players).length;
        const voteCount = Object.values(votes).length;

        if (voteCount < playerCount - 1) {
          return { newState: { ...s, validationVotes: votes } };
        }

        // Tally votes
        const yesVotes = Object.values(votes).filter(Boolean).length;
        const valid = yesVotes > voteCount / 2;

        const nextAnswerIndex = s.currentAnswerIndex + 1;
        const targetCount = s.currentBid?.count ?? 0;

        if (!valid || nextAnswerIndex >= targetCount) {
          // Scoring
          const newScores = { ...s.scores };
          if (valid && nextAnswerIndex >= targetCount) {
            // Completed bid — bidder scores
            const timeMultiplier = (65 - s.roundTimeLimit) / 10;
            const baseScore = Math.round(targetCount * (s.difficulty * 10) * timeMultiplier);
            newScores[s.currentBid!.playerId] = (newScores[s.currentBid!.playerId] ?? 0) + baseScore;
          } else if (s.doubledBy) {
            // Failed double dare — challenger scores
            newScores[s.doubledBy] = (newScores[s.doubledBy] ?? 0) + 20;
          }

          return {
            newState: {
              ...s,
              scores: newScores,
              phase: 'scoring',
              validationVotes: {},
              phaseTimeoutMs: 5000,
            },
          };
        }

        return {
          newState: {
            ...s,
            validationVotes: {},
            currentAnswerIndex: nextAnswerIndex,
          },
        };
      }

      case 'NEXT_ROUND': {
        const nextBidding = (s.biddingIndex + 1) % s.biddingOrder.length;
        const isLastRound = s.round >= s.maxRounds;
        const entries = await getContentEntries(options.selectedPacks, 'topic');
        const topic = entries.length > 0 ? pickRandom(entries) : { topic: 'Sports', difficulty: 2 };

        return {
          newState: {
            ...s,
            phase: isLastRound ? 'winner' : 'round-start',
            round: isLastRound ? s.round : s.round + 1,
            biddingIndex: nextBidding,
            topic: (topic as { topic: string }).topic,
            difficulty: ((topic as { difficulty: number }).difficulty ?? 1) as 1 | 2 | 3,
            roundTimeLimit: pickRandom(TIME_LIMIT_OPTIONS) as number,
            currentBid: null,
            doubledBy: null,
            answers: [],
            validationVotes: {},
            currentAnswerIndex: 0,
          },
        };
      }

      default:
        return { newState: s };
    }
  },

  async handleTimeout(state: any, _options: any): Promise<StateTransition> {
    const s = state as DoubleDareGameState;
    if (s.phase === 'gameplay') {
      // Time ran out — if double dared, challenger wins points
      const newScores = { ...s.scores };
      if (s.doubledBy) {
        newScores[s.doubledBy] = (newScores[s.doubledBy] ?? 0) + 20;
      }
      return {
        newState: { ...s, phase: 'scoring', scores: newScores, phaseTimeoutMs: 5000 },
      };
    }
    return { newState: s };
  },

  getPhaseTimeout: (state: any) => {
    const s = state as DoubleDareGameState;
    if (s.phase === 'performing' && s.phaseTimeoutMs) return s.phaseTimeoutMs;
    if (s.phase === 'scoring' && s.phaseTimeoutMs) return s.phaseTimeoutMs;
    return null;
  },

  isGameOver: (state: any) => {
    return (state as DoubleDareGameState).phase === 'winner';
  },

  getFinalScores: (state: any) => {
    return state.scores;
  },
};

export default DOUBLE_DARE;

