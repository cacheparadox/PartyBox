import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off, DataSnapshot, get, set, update, remove, runTransaction } from 'firebase/database';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { connectDatabaseEmulator } from 'firebase/database';

// ─── Firebase Config ───
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? 'http://localhost:9000?ns=demo-partybox',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-partybox',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-partybox.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:000000000000',
};

export const IS_CONFIGURED = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// ─── Emulator Setup (dev mode) ───
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDatabaseEmulator(rtdb, 'localhost', 9000);
}

// ─── Typed Imports ───
import type {
  CreateRoomPayload, CreateRoomResult,
  JoinRoomPayload, JoinRoomResult,
  KickPlayerPayload,
  UpdateAISettingsPayload,
  StartGamePayload,
  PlayerActionPayload,
  SetReadyPayload,
  AISettings,
  ContentPackId,
  Room, Player, GameId, GameState
} from '../../../shared/src/index';

import { setupGame, handlePlayerAction, isGameOver } from '../engine/services/GameEngine';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  return code;
}
function genId(length = 16) {
  return Array.from({length}, () => Math.random().toString(36)[2] || '0').join('');
}

/**
 * Firebase RTDB rejects `undefined` values at any depth.
 * This strips them recursively, converting undefined → null for nullable fields
 * and omitting purely undefined keys.
 */
function sanitizeForRTDB(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForRTDB);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) result[k] = sanitizeForRTDB(v);
  }
  return result;
}

export async function callCreateRoom({ nickname }: CreateRoomPayload): Promise<CreateRoomResult> {
  const roomCode = generateRoomCode();
  const playerId = genId(16);
  const playerToken = genId(32);
  const now = Date.now();

  const hostPlayer: Player = { id: playerId, nickname, isHost: true, isReady: false, score: 0, isConnected: true, joinedAt: now };
  const room: Room = { code: roomCode, hostId: playerId, status: 'lobby', gameId: null, selectedPacks: ['general-knowledge'], aiSettings: null, createdAt: now };

  await setDoc(doc(db, 'rooms', roomCode), room);
  await setDoc(doc(db, 'rooms', roomCode, 'players', playerId), hostPlayer);
  await setDoc(doc(db, 'rooms', roomCode, 'playerTokens', playerId), { token: playerToken, playerId });

  await set(ref(rtdb, `rooms/${roomCode}`), {
    status: 'lobby',
    hostId: playerId,
    players: { [playerId]: hostPlayer },
    gameState: null,
    gameId: null,
  });

  return { roomCode, playerId, playerToken };
}

export async function callJoinRoom({ roomCode, nickname, playerToken }: JoinRoomPayload): Promise<JoinRoomResult> {
  const normalizedCode = roomCode.toUpperCase().trim();
  const roomDoc = await getDoc(doc(db, 'rooms', normalizedCode));
  if (!roomDoc.exists()) throw new Error('ROOM_NOT_FOUND');
  
  if (playerToken) {
    const q = query(collection(db, 'rooms', normalizedCode, 'playerTokens'), where('token', '==', playerToken));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existingPlayerId = snap.docs[0].data().playerId;
      await update(ref(rtdb, `rooms/${normalizedCode}/players/${existingPlayerId}`), { isConnected: true, nickname });
      return { playerId: existingPlayerId, playerToken };
    }
  }

  const playerId = genId(16);
  const newToken = genId(32);
  const now = Date.now();
  const player: Player = { id: playerId, nickname, isHost: false, isReady: false, score: 0, isConnected: true, joinedAt: now };

  await setDoc(doc(db, 'rooms', normalizedCode, 'players', playerId), player);
  await setDoc(doc(db, 'rooms', normalizedCode, 'playerTokens', playerId), { token: newToken, playerId });
  await set(ref(rtdb, `rooms/${normalizedCode}/players/${playerId}`), player);

  return { playerId, playerToken: newToken };
}

export async function callKickPlayer({ roomCode, targetPlayerId, requestingPlayerId }: KickPlayerPayload & { requestingPlayerId: string }): Promise<void> {
  await remove(ref(rtdb, `rooms/${roomCode}/players/${targetPlayerId}`));
}

export async function callSetReady({ roomCode, isReady, playerId }: SetReadyPayload & { playerId: string }): Promise<void> {
  await update(ref(rtdb, `rooms/${roomCode}/players/${playerId}`), { isReady });
}

export async function callUpdateAISettings({ roomCode, settings }: UpdateAISettingsPayload & { requestingPlayerId: string }): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomCode), { aiSettings: settings });
}

export async function callUpdateSelectedPacks({ roomCode, selectedPacks }: { roomCode: string; selectedPacks: ContentPackId[]; requestingPlayerId: string }): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomCode), { selectedPacks });
}

export async function callStartGame({ roomCode, gameId, selectedPacks, requestingPlayerId }: StartGamePayload & { requestingPlayerId: string }): Promise<void> {
  const roomDoc = await getDoc(doc(db, 'rooms', roomCode));
  const room = roomDoc.data() as Room;

  const playersSnap = await get(ref(rtdb, `rooms/${roomCode}/players`));
  const players = playersSnap.val() ?? {};

  const options = { selectedPacks, players, aiSettings: room.aiSettings };
  const { newState, privateData } = await setupGame(gameId, options);

  await updateDoc(doc(db, 'rooms', roomCode), { status: 'playing', gameId });
  await update(ref(rtdb, `rooms/${roomCode}`), { status: 'playing', gameId, gameState: sanitizeForRTDB(newState) });

  if (privateData) {
    // Use set() (not update()) so that arrays aren't merged into RTDB objects with numeric keys
    const writes = Object.entries(privateData).map(([pid, data]) => set(ref(rtdb, `private/${roomCode}/${pid}`), data));
    await Promise.all(writes);
  }
}

export async function callPlayerAction({ roomCode, action, data, playerId }: PlayerActionPayload & { playerId: string }): Promise<void> {
  const roomDoc = await getDoc(doc(db, 'rooms', roomCode));
  const room = roomDoc.data() as Room;

  // Manual optimistic state update since RTDB runTransaction retries on side effects.
  const stateSnap = await get(ref(rtdb, `rooms/${roomCode}/gameState`));
  const state = stateSnap.val();
  if (!state) return;

  const playersSnap = await get(ref(rtdb, `rooms/${roomCode}/players`));
  const players = playersSnap.val() ?? {};

  const options = { selectedPacks: room.selectedPacks, players, aiSettings: room.aiSettings };

  const { newState, privateData } = await handlePlayerAction(room.gameId as GameId, state, playerId, action, data, options);

  await set(ref(rtdb, `rooms/${roomCode}/gameState`), sanitizeForRTDB(newState));

  if (privateData) {
    const writes = Object.entries(privateData).map(([pid, pdata]) => update(ref(rtdb, `private/${roomCode}/${pid}`), pdata));
    await Promise.all(writes);
  }

  if (isGameOver(room.gameId as GameId, newState)) {
    await updateDoc(doc(db, 'rooms', roomCode), { status: 'finished' });
    await update(ref(rtdb, `rooms/${roomCode}`), { status: 'finished' });
  }
}

export async function callEndGame({ roomCode }: { roomCode: string; requestingPlayerId: string }): Promise<void> {
  await updateDoc(doc(db, 'rooms', roomCode), { status: 'lobby', gameId: null });
  await update(ref(rtdb, `rooms/${roomCode}`), { status: 'lobby', gameId: null });
  await remove(ref(rtdb, `rooms/${roomCode}/gameState`));
}

// ─── RTDB Subscription Helper ───
export function subscribeToPath<T>(path: string, callback: (data: T | null) => void): () => void {
  const dbRef = ref(rtdb, path);
  const handler = (snap: DataSnapshot) => callback(snap.val() as T | null);
  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
}
