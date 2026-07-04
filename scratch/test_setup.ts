import { setupGame } from './client/src/engine/services/GameEngine.js';

async function run() {
  try {
    const options = {
      selectedPacks: [],
      players: {
        'player1': { id: 'player1', nickname: 'Test' },
        'player2': { id: 'player2', nickname: 'Test2' }
      },
      aiSettings: null
    };
    const { newState, privateData } = await setupGame('slip-it-in', options);
    console.log('newState', newState);
    console.log('privateData', privateData);
  } catch(e) {
    console.error('ERROR:', e);
  }
}

run();
