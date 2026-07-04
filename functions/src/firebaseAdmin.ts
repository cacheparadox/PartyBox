import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// When running in Cloud Functions environment, no credential needed (auto-detected)
// When running locally with emulators, FIREBASE_CONFIG env var is set by emulator
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const rtdb = admin.database();
export const auth = admin.auth();

// Realtime Database helper: get a room's root ref
export const roomRef = (roomCode: string) => rtdb.ref(`rooms/${roomCode}`);
export const roomStateRef = (roomCode: string) => rtdb.ref(`rooms/${roomCode}/state`);
export const roomPlayersRef = (roomCode: string) => rtdb.ref(`rooms/${roomCode}/players`);
export const privatePlayerDataRef = (roomCode: string, playerId: string) =>
  rtdb.ref(`rooms/${roomCode}/privatePlayerData/${playerId}`);
