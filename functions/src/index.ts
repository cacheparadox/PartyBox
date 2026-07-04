import * as functions from 'firebase-functions';
import './firebaseAdmin'; // ensure admin is initialized
import { db, rtdb, roomRef, roomStateRef, privatePlayerDataRef } from './firebaseAdmin';
import {
  createRoom,
  joinRoom,
  kickPlayer,
  setPlayerReady,
  updateAISettings,
  updateSelectedPacks,
} from './services/RoomService';
import {
  setupGame,
  handlePlayerAction,
  handlePhaseTimeout,
  isGameOver,
} from './services/GameEngine';
import {
  CreateRoomPayload,
  CreateRoomResult,
  JoinRoomPayload,
  JoinRoomResult,
  KickPlayerPayload,
  UpdateAISettingsPayload,
  StartGamePayload,
  PlayerActionPayload,
  SetReadyPayload,
  Room,
  GameId,
} from '../../shared/src/index';

// ─────────────────────────────────────────────
// Room Management
// ─────────────────────────────────────────────

export const fnCreateRoom = functions.https.onCall(
  async (request: functions.https.CallableRequest<CreateRoomPayload>): Promise<CreateRoomResult> => {
    const { nickname } = request.data;
    if (!nickname?.trim()) throw new functions.https.HttpsError('invalid-argument', 'Nickname required');
    return createRoom(nickname.trim());
  }
);

export const fnJoinRoom = functions.https.onCall(
  async (request: functions.https.CallableRequest<JoinRoomPayload>): Promise<JoinRoomResult> => {
    const { roomCode, nickname, playerToken } = request.data;
    if (!roomCode || !nickname?.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Room code and nickname required');
    }
    try {
      return await joinRoom(roomCode, nickname.trim(), playerToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'UNKNOWN';
      if (msg === 'ROOM_NOT_FOUND') throw new functions.https.HttpsError('not-found', 'Room not found');
      if (msg === 'ROOM_FULL') throw new functions.https.HttpsError('resource-exhausted', 'Room is full');
      if (msg === 'ROOM_FINISHED') throw new functions.https.HttpsError('failed-precondition', 'Game already ended');
      throw new functions.https.HttpsError('internal', 'Failed to join room');
    }
  }
);

export const fnKickPlayer = functions.https.onCall(
  async (request: functions.https.CallableRequest<KickPlayerPayload>): Promise<void> => {
    const { roomCode, targetPlayerId } = request.data;
    const callerId = request.auth?.uid ?? request.data.requestingPlayerId as string;
    if (!callerId) throw new functions.https.HttpsError('unauthenticated', 'Player ID required');
    await kickPlayer(roomCode, callerId, targetPlayerId);
  }
);

export const fnSetReady = functions.https.onCall(
  async (request: functions.https.CallableRequest<SetReadyPayload & { playerId: string }>): Promise<void> => {
    const { roomCode, isReady, playerId } = request.data;
    await setPlayerReady(roomCode, playerId, isReady);
  }
);

export const fnUpdateAISettings = functions.https.onCall(
  async (request: functions.https.CallableRequest<UpdateAISettingsPayload & { requestingPlayerId: string }>): Promise<void> => {
    const { roomCode, settings, requestingPlayerId } = request.data;
    await updateAISettings(roomCode, requestingPlayerId, settings);
  }
);

export const fnUpdateSelectedPacks = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ roomCode: string; selectedPacks: string[]; requestingPlayerId: string }>): Promise<void> => {
    const { roomCode, selectedPacks, requestingPlayerId } = request.data;
    await updateSelectedPacks(roomCode, requestingPlayerId, selectedPacks as import('../../shared/src/index').ContentPackId[]);
  }
);

// ─────────────────────────────────────────────
// Game Lifecycle
// ─────────────────────────────────────────────

export const fnStartGame = functions.https.onCall(
  async (request: functions.https.CallableRequest<StartGamePayload & { requestingPlayerId: string }>): Promise<void> => {
    const { roomCode, gameId, selectedPacks, requestingPlayerId } = request.data;

    const roomDoc = await db.collection('rooms').doc(roomCode).get();
    if (!roomDoc.exists) throw new functions.https.HttpsError('not-found', 'Room not found');

    const room = roomDoc.data() as Room;
    if (room.hostId !== requestingPlayerId) {
      throw new functions.https.HttpsError('permission-denied', 'Only host can start the game');
    }

    // Load players from RTDB
    const playersSnap = await rtdb.ref(`rooms/${roomCode}/players`).get();
    const players = playersSnap.val() ?? {};

    const options = {
      selectedPacks: selectedPacks as import('../../shared/src/index').ContentPackId[],
      players,
      aiSettings: room.aiSettings,
    };

    const { newState, privateData } = await setupGame(gameId as GameId, options);

    // Update room status
    await db.collection('rooms').doc(roomCode).update({ status: 'playing', gameId });

    // Write game state to RTDB
    await roomStateRef(roomCode).set(newState);
    await roomRef(roomCode).update({ status: 'playing', gameId });

    // Write private data to individual player nodes
    if (privateData) {
      const writes = Object.entries(privateData).map(([playerId, data]) =>
        privatePlayerDataRef(roomCode, playerId).update(data)
      );
      await Promise.all(writes);
    }
  }
);

export const fnPlayerAction = functions.https.onCall(
  async (request: functions.https.CallableRequest<PlayerActionPayload & { playerId: string }>): Promise<void> => {
    const { roomCode, action, data, playerId } = request.data;

    const roomDoc = await db.collection('rooms').doc(roomCode).get();
    if (!roomDoc.exists) throw new functions.https.HttpsError('not-found', 'Room not found');
    const room = roomDoc.data() as Room;

    const stateSnap = await roomStateRef(roomCode).get();
    const state = stateSnap.val();
    if (!state) throw new functions.https.HttpsError('failed-precondition', 'Game not started');

    const playersSnap = await rtdb.ref(`rooms/${roomCode}/players`).get();
    const players = playersSnap.val() ?? {};

    const options = {
      selectedPacks: room.selectedPacks,
      players,
      aiSettings: room.aiSettings,
    };

    const { newState, privateData } = await handlePlayerAction(
      room.gameId as GameId,
      state,
      playerId,
      action,
      data,
      options
    );

    // Write new state to RTDB
    await roomStateRef(roomCode).set(newState);

    // Write any private data
    if (privateData) {
      const writes = Object.entries(privateData).map(([pid, pdata]) =>
        privatePlayerDataRef(roomCode, pid).update(pdata)
      );
      await Promise.all(writes);
    }

    // Check if game ended
    if (isGameOver(room.gameId as GameId, newState)) {
      await db.collection('rooms').doc(roomCode).update({ status: 'finished' });
      await roomRef(roomCode).update({ status: 'finished' });
    }
  }
);

export const fnEndGame = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ roomCode: string; requestingPlayerId: string }>): Promise<void> => {
    const { roomCode, requestingPlayerId } = request.data;
    const roomDoc = await db.collection('rooms').doc(roomCode).get();
    const room = roomDoc.data() as Room;
    if (room.hostId !== requestingPlayerId) throw new functions.https.HttpsError('permission-denied', 'Only host can end game');

    await db.collection('rooms').doc(roomCode).update({ status: 'lobby', gameId: null });
    await roomRef(roomCode).update({ status: 'lobby', gameId: null });
    await roomStateRef(roomCode).remove();
  }
);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

export const health = functions.https.onRequest((_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});
