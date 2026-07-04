import type {
  GameState,
  GameId,
  BaseGameState,
  ContentPackId,
  Player,
  AISettings,
} from '../../../../shared/src/index';

export interface GameOptions {
  selectedPacks: ContentPackId[];
  players: Record<string, Player>;
  aiSettings: AISettings | null;
}

export interface StateTransition {
  newState: GameState;
  privateData?: Record<string, Record<string, unknown>>; // playerId → their private data
}

export interface GamePlugin {
  id: GameId;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedDurationMinutes: number;
  usesAI: boolean;

  /**
   * Called once when the host starts the game.
   * Returns the initial game state and any private data to send to individual players.
   */
  setup(options: GameOptions): Promise<StateTransition>;

  /**
   * Called when a player submits an action.
   * Returns the updated state (and optionally new private data).
   */
  handleAction(
    state: GameState,
    playerId: string,
    action: string,
    data: Record<string, unknown>,
    options: GameOptions
  ): Promise<StateTransition>;

  /**
   * Called by the phase timer when time runs out.
   * Returns the state after timeout (usually advances phase).
   */
  handleTimeout(state: GameState, options: GameOptions): Promise<StateTransition>;

  /**
   * Returns the timeout in milliseconds for the current phase, or null if no timeout.
   */
  getPhaseTimeout(state: GameState): number | null;

  /**
   * Returns true if the game is over.
   */
  isGameOver(state: GameState): boolean;

  /**
   * Returns final scores.
   */
  getFinalScores(state: GameState): Record<string, number>;
}

// Helper to create a base game state
export function createBaseState(
  gameId: GameId,
  playerIds: string[],
  maxRounds = 3
): BaseGameState {
  return {
    gameId,
    phase: 'instructions',
    round: 1,
    maxRounds,
    scores: Object.fromEntries(playerIds.map((id) => [id, 0])),
    phaseStartedAt: Date.now(),
    phaseTimeoutMs: null,
  };
}

// Utility: shuffle array
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Utility: pick random element
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

