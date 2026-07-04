import type { GamePlugin, GameOptions, StateTransition } from '../GamePlugin';
import { createBaseState, shuffle, pickRandom } from '../GamePlugin';
import type { RGWGameState, RGWQuestion } from '../../../../../shared/src/index';
import { getContentEntries } from '../../services/ContentService';
import { generateIdentity } from '../../services/AIService';


const SCORE_TABLE = [20, 16, 13, 10, 8, 6, 5, 4, 3, 2]; // points by question count

const REVERSE_GUESS_WHO: GamePlugin = {
  id: 'reverse-guess-who',
  name: 'Reverse Guess Who',
  description: 'One player holds a secret identity. Others ask yes/no questions to find out who.',
  minPlayers: 2,
  maxPlayers: 12,
  estimatedDurationMinutes: 15,
  usesAI: true,

  async setup(options: any): Promise<StateTransition> {
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
  getFinalScores: (state: any) => {
    return state.scores;
  },
};

export default REVERSE_GUESS_WHO;

