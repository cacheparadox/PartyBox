import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Room, Player, GameState, GameId, ContentPackId, AISettings, RoomStatus,
} from '../../../shared/src/index';

// ─── Player Identity Store (persisted for rejoin) ───
interface PlayerIdentityState {
  playerId: string | null;
  playerToken: string | null;
  nickname: string | null;
  roomCode: string | null;
  setIdentity: (playerId: string, playerToken: string, nickname: string, roomCode: string) => void;
  clearIdentity: () => void;
}

export const usePlayerIdentity = create<PlayerIdentityState>()(
  persist(
    (set) => ({
      playerId: null,
      playerToken: null,
      nickname: null,
      roomCode: null,
      setIdentity: (playerId, playerToken, nickname, roomCode) =>
        set({ playerId, playerToken, nickname, roomCode }),
      clearIdentity: () =>
        set({ playerId: null, playerToken: null, nickname: null, roomCode: null }),
    }),
    { name: 'partybox-player-identity' }
  )
);

// ─── Room State Store (from RTDB) ───
interface RoomState {
  roomCode: string | null;
  roomStatus: RoomStatus | null;
  hostId: string | null;
  players: Record<string, Player>;
  gameId: GameId | null;
  gameState: GameState | null;
  privateData: Record<string, unknown> | null;

  setRoomCode: (code: string) => void;
  updateRoomSnapshot: (snapshot: {
    status: RoomStatus;
    hostId: string;
    players: Record<string, Player>;
    gameId: GameId | null;
    gameState: GameState | null;
  }) => void;
  setPrivateData: (data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  roomCode: null,
  roomStatus: null,
  hostId: null,
  players: {},
  gameId: null,
  gameState: null,
  privateData: null,

  setRoomCode: (code) => set({ roomCode: code }),

  updateRoomSnapshot: (snapshot) =>
    set({
      roomStatus: snapshot.status,
      hostId: snapshot.hostId,
      players: snapshot.players ?? {},
      gameId: snapshot.gameId,
      gameState: snapshot.gameState,
    }),

  setPrivateData: (data) => set({ privateData: data }),

  reset: () =>
    set({
      roomCode: null,
      roomStatus: null,
      hostId: null,
      players: {},
      gameId: null,
      gameState: null,
      privateData: null,
    }),
}));

// ─── UI State Store ───
interface UIState {
  isLoading: boolean;
  error: string | null;
  isHost: boolean;

  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setIsHost: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isLoading: false,
  error: null,
  isHost: false,
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  setIsHost: (v) => set({ isHost: v }),
}));
