// ─────────────────────────────────────────────
// Core Platform Types
// ─────────────────────────────────────────────

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export type GameId =
  | 'double-dare'
  | 'slip-it-in'
  | 'chameleon'
  | 'mole'
  | 'build-a-bluff'
  | 'reverse-guess-who';

export type ContentPackId =
  | 'general-knowledge'
  | 'movies'
  | 'tv-shows'
  | 'gaming'
  | 'anime'
  | 'sports'
  | 'history'
  | 'science'
  | 'geography'
  | 'food'
  | 'internet-culture'
  | 'family-friendly'
  | 'adults-only';

export interface AISettings {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  isConnected: boolean;
  joinedAt: number;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  gameId: GameId | null;
  selectedPacks: ContentPackId[];
  aiSettings: AISettings | null;
  createdAt: number;
}

// ─────────────────────────────────────────────
// Game Phase Types
// ─────────────────────────────────────────────

export type GamePhase =
  | 'instructions'
  | 'round-start'
  | 'gameplay'
  | 'voting'
  | 'scoring'
  | 'winner'
  | 'lobby';

export interface BaseGameState {
  gameId: GameId;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  scores: Record<string, number>; // playerId → score
  phaseStartedAt: number;
  phaseTimeoutMs: number | null;
}

// ─────────────────────────────────────────────
// Double Dare
// ─────────────────────────────────────────────

export interface DoubleDareGameState extends BaseGameState {
  gameId: 'double-dare';
  topic: string;
  difficulty: 1 | 2 | 3;
  roundTimeLimit: number; // 5s to 60s randomly assigned by game
  currentBid: {
    playerId: string;
    count: number;
  } | null;
  doubledBy: string | null; // playerId who issued double dare
  answers: string[];
  validationVotes: Record<string, boolean>; // playerId → thumbs up/down
  currentAnswerIndex: number;
  biddingOrder: string[]; // playerIds in bidding order
  biddingIndex: number;
}

// ─────────────────────────────────────────────
// Slip It In
// ─────────────────────────────────────────────

export interface SlipItInPhrase {
  id: string;
  phrase: string;
  completed: boolean;
}

export interface SlipItInClaim {
  phraseId: string;
  phrase: string;
  startedAt: number;
  pausedAt: number | null;
  accusedBy: string | null;
}

export interface SlipItInVote {
  phraseId: string;
  phrase: string;
  votes: Record<string, boolean>; // voterId -> true/false
}

export interface SlipItInGameState extends BaseGameState {
  gameId: 'slip-it-in';
  honorRules: boolean;
  phraseDeck: SlipItInPhrase[];
  playerPhraseCount: Record<string, number>; // playerId → remaining phrases
  activeClaims: Record<string, SlipItInClaim>; // playerId → active claim
  activeVotes: Record<string, SlipItInVote>; // playerId → active vote
  accusationLog: Array<{
    accuserId: string;
    accusedId: string;
    phraseId?: string;
    correct: boolean;
    timestamp: number;
  }>;
  phraseLog: Array<{
    playerId: string;
    phrase: string;
    timestamp: number;
  }>; // public feed: "{name} slipped in phrase"
  winnerId: string | null;
}

// ─────────────────────────────────────────────
// Chameleon
// ─────────────────────────────────────────────

export interface ChameleonGameState extends BaseGameState {
  gameId: 'chameleon';
  category: string;
  // word is hidden from chameleon, sent individually to each player
  clueGrid: Array<{ playerId: string; clue: string | null }>;
  votes: Record<string, string>; // voterId → suspectedPlayerId
  chameleonId: string; // revealed after voting
  revealedWord: string | null; // revealed after voting
  chameleonGuess: string | null;
}

// ─────────────────────────────────────────────
// Mole
// ─────────────────────────────────────────────

export interface MoleGameState extends BaseGameState {
  gameId: 'mole';
  category: string;
  // real word and mole word sent individually
  clueGrid: Array<{ playerId: string; clue: string | null }>;
  votes: Record<string, string>;
  moleId: string; // revealed after voting
  revealedWord: string | null;
  revealedMoleWord: string | null;
}

// ─────────────────────────────────────────────
// Build a Bluff
// ─────────────────────────────────────────────

export interface BluffAnswer {
  id: string;
  text: string;
  authorId: string | 'ai' | 'real';
}

export interface BuildABluffGameState extends BaseGameState {
  gameId: 'build-a-bluff';
  question: string;
  answers: BluffAnswer[]; // shuffled, real answer mixed in
  votes: Record<string, string>; // voterId → answerId
  realAnswerId: string; // revealed after voting
  submittedBluffs: Record<string, boolean>; // playerId → has submitted
}

// ─────────────────────────────────────────────
// Reverse Guess Who
// ─────────────────────────────────────────────

export interface RGWQuestion {
  id: string;
  askerId: string;
  text: string;
  answer: 'yes' | 'no' | null;
  answeredAt: number | null;
}

export interface RGWGameState extends BaseGameState {
  gameId: 'reverse-guess-who';
  identityHolderId: string;
  identityCategory: string;
  // identity name sent only to identityHolderId privately
  questions: RGWQuestion[];
  skipVotes: Record<string, boolean>; // playerId → voted to skip
  skipsUsed: number;
  buzzerId: string | null; // who buzzed to guess
  buzzerGuess: string | null;
  revealed: boolean;
  revealedIdentity: string | null;
}

// ─────────────────────────────────────────────
// Union Game State
// ─────────────────────────────────────────────

export type GameState =
  | DoubleDareGameState
  | SlipItInGameState
  | ChameleonGameState
  | MoleGameState
  | BuildABluffGameState
  | RGWGameState;

// ─────────────────────────────────────────────
// Firebase RTDB Room Node Shape
// ─────────────────────────────────────────────

export interface RTDBRoom {
  status: RoomStatus;
  hostId: string;
  players: Record<string, Player>;
  gameState: GameState | null;
  gameId: GameId | null;
}

// ─────────────────────────────────────────────
// Callable Function Payloads
// ─────────────────────────────────────────────

export interface CreateRoomPayload {
  nickname: string;
}
export interface CreateRoomResult {
  roomCode: string;
  playerId: string;
  playerToken: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  playerToken?: string; // for rejoin
}
export interface JoinRoomResult {
  playerId: string;
  playerToken: string;
}

export interface KickPlayerPayload {
  roomCode: string;
  targetPlayerId: string;
}

export interface UpdateAISettingsPayload {
  roomCode: string;
  settings: AISettings;
}

export interface StartGamePayload {
  roomCode: string;
  gameId: GameId;
  selectedPacks: ContentPackId[];
}

export interface PlayerActionPayload {
  roomCode: string;
  action: string;
  data: Record<string, unknown>;
}

export interface SetReadyPayload {
  roomCode: string;
  isReady: boolean;
}

// ─────────────────────────────────────────────
// Content Pack Types
// ─────────────────────────────────────────────

export type ContentEntryType = 'word-category' | 'trivia' | 'identity' | 'phrase' | 'topic';

export interface WordCategoryEntry {
  type: 'word-category';
  word: string;
  moleWord?: string; // for Mole game
  category: string;
  difficulty: 1 | 2 | 3;
}

export interface TriviaEntry {
  type: 'trivia';
  question: string;
  answer: string;
  difficulty: 1 | 2 | 3;
  category: string;
}

export interface IdentityEntry {
  type: 'identity';
  name: string;
  category: string; // 'Actors' | 'Musicians' | 'Athletes' | 'Politicians' | etc.
  era: string; // '1980s', '1990s', '2000s', etc.
  nationality?: string;
  hintTags: string[];
}

export interface PhraseEntry {
  type: 'phrase';
  phrase: string;
  difficulty: 1 | 2 | 3;
}

export interface TopicEntry {
  type: 'topic';
  topic: string;
  examples: string[];
  difficulty: 1 | 2 | 3;
}

export type ContentEntry =
  | WordCategoryEntry
  | TriviaEntry
  | IdentityEntry
  | PhraseEntry
  | TopicEntry;

export interface ContentPack {
  id: ContentPackId;
  name: string;
  description: string;
  isActive: boolean;
  supportedGames: GameId[];
  entryCount: number;
  createdAt: number;
  updatedAt: number;
}
