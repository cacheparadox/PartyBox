import { useState, useEffect } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { RGWGameState } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as RGWGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, sendAction, roomCode };
}

export default function ReverseGuessWhoView() {
  const { state, players, isHost, playerId, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (state?.phase === 'countdown' && state.phaseStartedAt && state.phaseTimeoutMs) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, state.phaseStartedAt! + state.phaseTimeoutMs! - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        if (remaining <= 0) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [state?.phase, state?.phaseStartedAt, state?.phaseTimeoutMs]);

  if (!state) return null;

  if (state.phase === 'instructions') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🌟</div>
          <h1 className="phase-banner text-magenta mb-4">REVERSE GUESS WHO</h1>
          <p className="text-white/60 mb-8 font-grotesk text-lg">
            Everyone gets a <strong className="text-spray">secret celebrity identity</strong>.
            When the countdown ends, put your phone on your forehead! Take turns asking yes/no questions to figure out who you are.
          </p>
          {isHost && <button id="btn-start-rgw" onClick={() => sendAction('START_ROUND')}
            className="btn-primary btn-lg w-full">START ROUND</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'countdown') {
    return (
      <div className="player-screen p-6 justify-center bg-magenta text-black transition-colors duration-1000">
        <div className="text-center animate-pop-in">
          <p className="font-bebas text-5xl mb-4">PUT PHONES ON FOREHEADS!</p>
          <p className="font-bebas text-9xl">{timeLeft ?? 10}</p>
          <p className="font-marker mt-8 opacity-60">No peeking!</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'round-start') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center">
          <div className="font-bebas text-5xl text-spray animate-pulse">GENERATING IDENTITIES...</div>
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay') {
    const myIdentity = state.identities?.[playerId ?? ''];
    const myStatus = state.completed?.[playerId ?? ''];

    if (myStatus) {
      return (
        <div className="player-screen p-6 justify-center">
          <div className="text-center animate-pop-in max-w-sm w-full mx-auto space-y-6">
            <p className="text-7xl">🎉</p>
            <h2 className="font-bebas text-4xl text-lime">YOU WERE {myIdentity?.name}</h2>
            <p className="font-marker text-white/40 text-sm animate-pulse">Wait for others to finish...</p>
            
            <div className="card p-4 bg-offblack border-white/10 mt-8">
              <p className="section-label mb-3">WHO'S STILL GUESSING?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.values(players).map(p => {
                  const done = !!state.completed[p.id];
                  return (
                    <span key={p.id} className={`px-3 py-1 rounded text-sm font-bebas ${done ? 'bg-lime/20 text-lime' : 'bg-white/10 text-white/40 animate-pulse'}`}>
                      {p.nickname}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="player-screen p-0 bg-black">
        {/* We use 100vh here and rotate it so if they hold the phone vertically, it's upside down, 
            but usually they hold it landscape on their forehead. Let's just make the text massive. */}
        <div className="w-full h-[100dvh] flex flex-col items-center justify-between p-8 text-center animate-pop-in">
          
          <div className="w-full flex-1 flex flex-col items-center justify-center transform rotate-180">
            <p className="text-spray font-bebas text-2xl mb-4 tracking-widest uppercase">YOU ARE</p>
            <h2 className="font-bebas text-6xl sm:text-7xl md:text-8xl text-white leading-tight px-4" 
                style={{ textShadow: '4px 4px 0 #FF2D78' }}>
              {myIdentity?.name ?? 'UNKNOWN'}
            </h2>
            <p className="font-marker text-white/60 mt-4 text-xl">({myIdentity?.category})</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 pb-8 relative z-10">
            <button 
              onClick={() => sendAction('COMPLETE_GUESS', { result: 'pass' })}
              className="py-6 rounded-2xl font-bebas text-3xl bg-white/10 text-white hover:bg-magenta hover:text-white transition-all border-2 border-transparent active:border-magenta">
              PASS
            </button>
            <button 
              onClick={() => sendAction('COMPLETE_GUESS', { result: 'correct' })}
              className="py-6 rounded-2xl font-bebas text-3xl bg-lime text-black hover:bg-lime/80 transition-all border-2 border-transparent active:border-white">
              I GUESSED IT!
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'scoring') {
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-6 animate-pop-in">
          <div>
            <p className="text-6xl mb-4 animate-float">🌟</p>
            <h2 className="phase-banner text-spray mb-2">ROUND OVER</h2>
          </div>
          
          <div className="card p-4 sm:p-6 bg-offblack shadow-cyan border-cyan max-w-sm mx-auto space-y-4">
            <p className="section-label mb-2">IDENTITIES & RESULTS</p>
            {Object.values(players).map(p => {
              const result = state.completed[p.id];
              const identity = state.identities[p.id]?.name;
              return (
                <div key={p.id} className="flex flex-col items-start border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between w-full items-center">
                    <span className="font-grotesk text-sm text-white/70">{p.nickname} was</span>
                    <span className={`font-bebas text-lg ${result === 'correct' ? 'text-lime' : 'text-magenta'}`}>
                      {result === 'correct' ? '+10 PTS' : 'PASSED'}
                    </span>
                  </div>
                  <span className="font-bebas text-2xl text-white">{identity}</span>
                </div>
              );
            })}
          </div>

          {isHost && <button onClick={() => sendAction('NEXT_ROUND')} className="btn-primary btn-lg w-full mt-4">
            {state.round >= state.maxRounds ? '🏆 SEE WINNER' : '▶ NEXT ROUND'}</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse mt-4">Waiting for host to continue...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'winner') {
    const sorted = Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0));
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-7xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-spray text-center mb-8" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
          {sorted[0]?.nickname} WINS!
        </h2>
        
        <div className="card p-6 shadow-magenta border-magenta w-full bg-offblack">
          {sorted.map((p,i) => (
            <div key={p.id} className="score-row py-2 border-b border-white/10 last:border-0">
              <span className="text-2xl w-8 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-2xl text-magenta">{state.scores[p.id]??0}</span>
            </div>
          ))}
        </div>

        {isHost && <button onClick={async () => { await callEndGame({ roomCode: roomCode!, requestingPlayerId: hostId }); navigate(`/lobby/${roomCode}`); }} 
          className="btn-primary btn-lg w-full mt-8">🔁 RETURN TO LOBBY</button>}
        {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse mt-8 text-center">Waiting for host...</p>}
      </div>
    );
  }

  return null;
}
