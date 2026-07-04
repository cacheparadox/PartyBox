import { GamePlugin, GameOptions, StateTransition } from '../games/GamePlugin';
import { GameState, GameId } from '../../../shared/src/index';
import DOUBLE_DARE from '../games/DoubleDare';
import SLIP_IT_IN from '../games/SlipItIn';
import CHAMELEON from '../games/Chameleon';
import MOLE from '../games/Mole';
import BUILD_A_BLUFF from '../games/BuildABluff';
import REVERSE_GUESS_WHO from '../games/ReverseGuessWho';

const PLUGINS: Record<GameId, GamePlugin> = {
  'double-dare': DOUBLE_DARE,
  'slip-it-in': SLIP_IT_IN,
  chameleon: CHAMELEON,
  mole: MOLE,
  'build-a-bluff': BUILD_A_BLUFF,
  'reverse-guess-who': REVERSE_GUESS_WHO,
};

export function getPlugin(gameId: GameId): GamePlugin {
  const plugin = PLUGINS[gameId];
  if (!plugin) throw new Error(`Unknown game: ${gameId}`);
  return plugin;
}

export async function setupGame(
  gameId: GameId,
  options: GameOptions
): Promise<StateTransition> {
  return getPlugin(gameId).setup(options);
}

export async function handlePlayerAction(
  gameId: GameId,
  state: GameState,
  playerId: string,
  action: string,
  data: Record<string, unknown>,
  options: GameOptions
): Promise<StateTransition> {
  return getPlugin(gameId).handleAction(state, playerId, action, data, options);
}

export async function handlePhaseTimeout(
  gameId: GameId,
  state: GameState,
  options: GameOptions
): Promise<StateTransition> {
  return getPlugin(gameId).handleTimeout(state, options);
}

export function isGameOver(gameId: GameId, state: GameState): boolean {
  return getPlugin(gameId).isGameOver(state);
}

export function getAllPlugins(): GamePlugin[] {
  return Object.values(PLUGINS);
}
