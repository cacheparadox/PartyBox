// Test if firebase.ts has undefined exports
import * as firebase from './client/src/services/firebase.ts';
console.log("firebase.db is:", firebase.db);
console.log("firebase.rtdb is:", firebase.rtdb);
