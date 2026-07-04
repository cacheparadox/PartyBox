import { useEffect } from 'react';
import { subscribeToPath } from '../services/firebase';
import { useRoomStore } from '../stores';
import type { RoomStatus, GameId, Player, GameState } from '../../../shared/src/index';

interface RTDBRoomSnapshot {
  status: RoomStatus;
  hostId: string;
  players: Record<string, Player>;
  gameId: GameId | null;
  gameState: GameState | null;
}

/**
 * Subscribes to the RTDB room node and syncs state into the room store.
 * Cleans up the listener on unmount.
 */
export function useRoomSubscription(roomCode: string | null) {
  const updateRoomSnapshot = useRoomStore((s) => s.updateRoomSnapshot);

  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = subscribeToPath<RTDBRoomSnapshot>(
      `rooms/${roomCode}`,
      (data) => {
        if (data) {
          updateRoomSnapshot({
            status: data.status,
            hostId: data.hostId,
            players: data.players ?? {},
            gameId: data.gameId ?? null,
            gameState: data.gameState ?? null,
          });
        }
      }
    );

    return unsubscribe;
  }, [roomCode, updateRoomSnapshot]);
}

/**
 * Subscribes to private player data (secret phrases, identities, etc.)
 */
export function usePrivateDataSubscription(roomCode: string | null, playerId: string | null) {
  const setPrivateData = useRoomStore((s) => s.setPrivateData);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const unsubscribe = subscribeToPath<Record<string, unknown>>(
      `private/${roomCode}/${playerId}`,
      (data) => {
        if (data) setPrivateData(data);
      }
    );

    return unsubscribe;
  }, [roomCode, playerId, setPrivateData]);
}
