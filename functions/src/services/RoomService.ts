import { db, rtdb, roomRef, roomPlayersRef, roomStateRef } from '../firebaseAdmin';
import { Room, Player, RoomStatus, GameId, ContentPackId, AISettings } from '../../shared/src/index';
import * as crypto from 'crypto';

const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O to avoid confusion

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generatePlayerToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function createRoom(nickname: string): Promise<{
  roomCode: string;
  playerId: string;
  playerToken: string;
}> {
  // Generate unique room code
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.collection('rooms').doc(roomCode).get();
    if (!existing.exists) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const playerId = generatePlayerId();
  const playerToken = generatePlayerToken();
  const now = Date.now();

  const hostPlayer: Player = {
    id: playerId,
    nickname,
    isHost: true,
    isReady: false,
    score: 0,
    isConnected: true,
    joinedAt: now,
  };

  const room: Room = {
    code: roomCode,
    hostId: playerId,
    status: 'lobby',
    gameId: null,
    selectedPacks: ['general-knowledge'],
    aiSettings: null,
    createdAt: now,
  };

  // Write to Firestore (persistent metadata)
  await db.collection('rooms').doc(roomCode).set(room);
  await db.collection('rooms').doc(roomCode).collection('players').doc(playerId).set(hostPlayer);

  // Store player token (for rejoin auth)
  await db
    .collection('rooms')
    .doc(roomCode)
    .collection('playerTokens')
    .doc(playerId)
    .set({ token: playerToken, playerId });

  // Write to RTDB (real-time state)
  await roomRef(roomCode).set({
    status: 'lobby',
    hostId: playerId,
    players: {
      [playerId]: hostPlayer,
    },
    gameState: null,
    gameId: null,
  });

  return { roomCode, playerId, playerToken };
}

export async function joinRoom(
  roomCode: string,
  nickname: string,
  playerToken?: string
): Promise<{ playerId: string; playerToken: string }> {
  const normalizedCode = roomCode.toUpperCase().trim();
  const roomDoc = await db.collection('rooms').doc(normalizedCode).get();

  if (!roomDoc.exists) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const room = roomDoc.data() as Room;

  if (room.status === 'finished') {
    throw new Error('ROOM_FINISHED');
  }

  // Check if rejoin
  if (playerToken) {
    const tokensSnap = await db
      .collection('rooms')
      .doc(normalizedCode)
      .collection('playerTokens')
      .where('token', '==', playerToken)
      .get();

    if (!tokensSnap.empty) {
      const tokenDoc = tokensSnap.docs[0].data();
      const existingPlayerId = tokenDoc.playerId as string;

      // Reconnect player in RTDB
      await roomPlayersRef(normalizedCode).child(existingPlayerId).update({
        isConnected: true,
        nickname, // allow nickname update on rejoin
      });

      return { playerId: existingPlayerId, playerToken };
    }
  }

  // Check player count
  const playersSnap = await db
    .collection('rooms')
    .doc(normalizedCode)
    .collection('players')
    .get();

  if (playersSnap.size >= 12) {
    throw new Error('ROOM_FULL');
  }

  // New player
  const playerId = generatePlayerId();
  const newToken = generatePlayerToken();
  const now = Date.now();

  const player: Player = {
    id: playerId,
    nickname,
    isHost: false,
    isReady: false,
    score: 0,
    isConnected: true,
    joinedAt: now,
  };

  await db.collection('rooms').doc(normalizedCode).collection('players').doc(playerId).set(player);
  await db
    .collection('rooms')
    .doc(normalizedCode)
    .collection('playerTokens')
    .doc(playerId)
    .set({ token: newToken, playerId });

  await roomPlayersRef(normalizedCode).child(playerId).set(player);

  return { playerId, playerToken: newToken };
}

export async function kickPlayer(
  roomCode: string,
  requestingPlayerId: string,
  targetPlayerId: string
): Promise<void> {
  const roomDoc = await db.collection('rooms').doc(roomCode).get();
  if (!roomDoc.exists) throw new Error('ROOM_NOT_FOUND');

  const room = roomDoc.data() as Room;
  if (room.hostId !== requestingPlayerId) throw new Error('NOT_HOST');

  // Remove from RTDB
  await roomPlayersRef(roomCode).child(targetPlayerId).remove();

  // Mark as kicked in Firestore
  await db
    .collection('rooms')
    .doc(roomCode)
    .collection('players')
    .doc(targetPlayerId)
    .update({ isConnected: false, kicked: true });
}

export async function setPlayerReady(
  roomCode: string,
  playerId: string,
  isReady: boolean
): Promise<void> {
  await roomPlayersRef(roomCode).child(playerId).update({ isReady });
}

export async function updateAISettings(
  roomCode: string,
  requestingPlayerId: string,
  settings: AISettings
): Promise<void> {
  const roomDoc = await db.collection('rooms').doc(roomCode).get();
  if (!roomDoc.exists) throw new Error('ROOM_NOT_FOUND');

  const room = roomDoc.data() as Room;
  if (room.hostId !== requestingPlayerId) throw new Error('NOT_HOST');

  await db.collection('rooms').doc(roomCode).update({ aiSettings: settings });
}

export async function updateSelectedPacks(
  roomCode: string,
  requestingPlayerId: string,
  selectedPacks: ContentPackId[]
): Promise<void> {
  const roomDoc = await db.collection('rooms').doc(roomCode).get();
  if (!roomDoc.exists) throw new Error('ROOM_NOT_FOUND');

  const room = roomDoc.data() as Room;
  if (room.hostId !== requestingPlayerId) throw new Error('NOT_HOST');

  await db.collection('rooms').doc(roomCode).update({ selectedPacks });
}
