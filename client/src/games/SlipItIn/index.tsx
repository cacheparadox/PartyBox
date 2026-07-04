import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { SlipItInGameState, SlipItInPhrase } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId, privateData } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as SlipItInGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, privateData, sendAction, roomCode };
}

export default function SlipItInView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [accuseTarget, setAccuseTarget] = useState<string | null>(null);
  const [accusedPhrase, setAccusedPhrase] = useState<string>('');

  if (!state) return null;
  const myPhrases = (privateData as { phrases?: SlipItInPhrase[] } | null)?.phrases ?? [];
  const remainingPhrases = myPhrases.filter((p) => !p.completed);

  if (state.phase === 'instructions') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 text-center max-w-lg px-6 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🤫</div>
          <h1 className="phase-banner text-cyan mb-4">SLIP IT IN</h1>
          <p className="font-grotesk text-white/60 mb-8 text-lg">
            You each have <strong className="text-cyan">secret phrases</strong> to slip into conversation naturally.
            Catch others using their phrases to remove them. First to use all yours wins!
          </p>
          {isHost && <button id="btn-start-sii" onClick={() => sendAction('START_GAME')}
            className="btn-primary btn-lg btn-full">START GAME</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen p-4 pt-8'}>
        {isHost ? (
          <div className="relative z-10 w-full max-w-5xl px-8 animate-pop-in">
            <h2 className="phase-banner text-cyan text-center mb-8">SLIP IT IN</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {Object.values(players).map((p) => (
                <div key={p.id} className="card p-4 text-center border-cyan shadow-cyan bg-offblack">
                  <p className="font-bebas text-xl mb-1">{p.nickname}</p>
                  <p className="font-bebas text-5xl text-cyan">
                    {state.playerPhraseCount[p.id] ?? 0}
                  </p>
                  <p className="font-marker text-white/40 text-sm">phrases left</p>
                </div>
              ))}
            </div>
            <div className="card p-6 bg-offblack">
              <p className="section-label text-white/50 mb-4">RECENT ACCUSATIONS</p>
              <div className="space-y-3 font-grotesk">
                {state.accusationLog.slice(-5).reverse().map((log, i) => (
                  <div key={i} className={`flex items-center gap-2 py-2 border-b border-white/5 last:border-0`}>
                    <span className={log.correct ? 'text-lime' : 'text-magenta'}>
                      {log.correct ? '✅' : '❌'}
                    </span>
                    <span className="text-white font-bold">{players[log.accuserId]?.nickname}</span>
                    <span className="text-white/40">accused</span>
                    <span className="text-white font-bold">{players[log.accusedId]?.nickname}</span>
                  </div>
                ))}
              </div>
              {state.accusationLog.length === 0 && <p className="font-grotesk text-white/30 text-sm">No accusations yet...</p>}
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full space-y-6 animate-pop-in mt-6">
            {/* My Phrases */}
            <div className="card p-6 border-cyan shadow-cyan bg-offblack">
              <p className="section-label mb-4 text-cyan">
                YOUR SECRET PHRASES ({remainingPhrases.length} LEFT)
              </p>
              {remainingPhrases.length === 0 ? (
                <p className="text-lime font-bebas text-3xl text-center">ALL DONE! 🎉</p>
              ) : (
                <div className="space-y-3">
                  {remainingPhrases.map((phrase) => (
                    <div key={phrase.id} className="bg-cyan/10 border border-cyan/30 rounded-xl p-4 text-center">
                      <p className="font-bebas text-white text-2xl tracking-wide">"{phrase.phrase}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Player phrase counts */}
            <div className="card p-4 bg-offblack">
              <p className="section-label mb-3">EVERYONE'S PROGRESS</p>
              <div className="space-y-2">
                {Object.values(players).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1 font-bebas text-lg">
                    <span className="flex-1">{p.nickname}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: state.playerPhraseCount[p.id] ?? 0 }).map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-sm bg-cyan shadow-cyan" />
                      ))}
                    </div>
                    <span className="text-cyan text-xl w-6 text-right">
                      {state.playerPhraseCount[p.id] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accuse button */}
            {accuseTarget === null ? (
              <button id="btn-accuse" onClick={() => setAccuseTarget('')}
                className="btn-danger w-full py-4 text-xl animate-jitter">
                🚨 ACCUSE SOMEONE!
              </button>
            ) : (
              <div className="card p-6 space-y-4 border-magenta shadow-magenta bg-offblack">
                <p className="font-bebas text-magenta text-2xl">WHO DID YOU CATCH?</p>
                <select className="input-field font-bebas text-lg" value={accuseTarget}
                  onChange={(e) => setAccuseTarget(e.target.value)}>
                  <option value="">SELECT PLAYER...</option>
                  {Object.values(players).filter((p) => p.id !== playerId).map((p) => (
                    <option key={p.id} value={p.id}>{p.nickname}</option>
                  ))}
                </select>
                {accuseTarget && (
                  <>
                    <input className="input-field font-grotesk" placeholder="What phrase did they say?"
                      value={accusedPhrase} onChange={(e) => setAccusedPhrase(e.target.value)} />
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setAccuseTarget(null)}
                        className="btn-secondary flex-1">CANCEL</button>
                      <button id="btn-confirm-accuse" className="btn-primary flex-1 !bg-magenta !border-magenta !text-white"
                        onClick={() => {
                          sendAction('ACCUSE', { accusedId: accuseTarget, phrase: accusedPhrase });
                          setAccuseTarget(null); setAccusedPhrase('');
                        }}>
                        ACCUSE!
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'winner' || state.winnerId) {
    const winner = players[state.winnerId ?? ''];
    const sorted = Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0));
    return (
      <div className="host-screen">
        <div className="text-8xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-cyan text-center mb-8" style={{ textShadow: '6px 6px 0 #FF2D78' }}>
          {winner?.nickname} WINS!
        </h2>
        
        <div className="card p-8 shadow-magenta border-magenta w-full max-w-md mx-auto mb-8 bg-offblack">
          {sorted.map((p,i) => (
            <div key={p.id} className="score-row py-3">
              <span className="text-3xl w-10 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-2xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-3xl text-cyan">{state.scores[p.id]??0}</span>
            </div>
          ))}
        </div>

        {isHost && <button onClick={async () => { await callEndGame({ roomCode: roomCode!, requestingPlayerId: hostId }); navigate(`/lobby/${roomCode}`); }} 
          className="btn-primary btn-lg">🔁 RETURN TO LOBBY</button>}
      </div>
    );
  }

  return null;
}
