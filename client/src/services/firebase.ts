import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off, DataSnapshot } from 'firebase/database';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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
export const functions = getFunctions(app);

// ─── Emulator Setup (dev mode) ───
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDatabaseEmulator(rtdb, 'localhost', 9000);
}

// ─── Typed Callable Function Wrappers ───
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
} from '../../../shared/src/index';

export const callCreateRoom = httpsCallable<CreateRoomPayload, CreateRoomResult>(functions, 'fnCreateRoom');
export const callJoinRoom = httpsCallable<JoinRoomPayload, JoinRoomResult>(functions, 'fnJoinRoom');
export const callKickPlayer = httpsCallable<KickPlayerPayload, void>(functions, 'fnKickPlayer');
export const callSetReady = httpsCallable<SetReadyPayload & { playerId: string }, void>(functions, 'fnSetReady');
export const callUpdateAISettings = httpsCallable<UpdateAISettingsPayload & { requestingPlayerId: string }, void>(functions, 'fnUpdateAISettings');
export const callUpdateSelectedPacks = httpsCallable<{ roomCode: string; selectedPacks: ContentPackId[]; requestingPlayerId: string }, void>(functions, 'fnUpdateSelectedPacks');
export const callStartGame = httpsCallable<StartGamePayload & { requestingPlayerId: string }, void>(functions, 'fnStartGame');
export const callPlayerAction = httpsCallable<PlayerActionPayload & { playerId: string }, void>(functions, 'fnPlayerAction');
export const callEndGame = httpsCallable<{ roomCode: string; requestingPlayerId: string }, void>(functions, 'fnEndGame');

// ─── RTDB Subscription Helper ───
export function subscribeToPath<T>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const dbRef = ref(rtdb, path);
  const handler = (snap: DataSnapshot) => {
    callback(snap.val() as T | null);
  };
  onValue(dbRef, handler);
  return () => off(dbRef, 'value', handler);
}
