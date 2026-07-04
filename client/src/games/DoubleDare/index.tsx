import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { DoubleDareGameState } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as DoubleDareGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, sendAction, roomCode };
}

export default function DoubleDareView() {
  const { state, players, isHost, playerId, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [bidCount, setBidCount] = useState(5);
  const [answer, setAnswer] = useState('');

  if (!state) return null;

  const currentBidder = state.biddingOrder?.[state.biddingIndex];
  const isMyBid = playerId === currentBidder;

  // ── Instructions ─────────────────────────────────────────────────────────
  if (state.phase === 'instructions') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🎯</div>
          <h1 className="phase-banner text-yellow mb-4">DOUBLE DARE</h1>
          <p className="font-grotesk text-white/60 mb-8 text-lg">
            Bid how many items from a category you can name in a given time. 
            Another player can <strong className="text-yellow">DOUBLE DARE</strong> you to prove it!
          </p>
          {isHost && (
            <button id="btn-start-dd" onClick={() => sendAction('START_ROUND')}
              className="btn-primary btn-lg btn-full !bg-yellow !border-yellow !text-black">
              START ROUND
            </button>
          )}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  // ── Bidding phase ────────────────────────────────────────────────────────
  if (state.phase === 'gameplay') {
    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="w-full space-y-6 text-center animate-pop-in">
          {/* Topic & Current Bid Status */}
          <div className="card p-6 border-yellow shadow-spray-sm bg-offblack">
            <p className="section-label mb-2">TOPIC</p>
            <p className="font-bebas text-4xl sm:text-5xl text-yellow leading-none">{state.topic}</p>
            <div className="flex justify-center gap-3 mt-4 flex-wrap">
              <span className="tag-yellow text-sm px-3 py-1">{'⭐'.repeat(state.difficulty)} DIFFICULTY</span>
              <span className="tag-cyan text-sm px-3 py-1 text-black">⏱️ {state.roundTimeLimit}s</span>
            </div>
            
            {state.currentBid && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="font-bebas text-white/50 text-sm">CURRENT HIGH BID:</p>
                <p className="font-bebas text-3xl text-cyan mt-1">
                  {players[state.currentBid.playerId]?.nickname} BIDS {state.currentBid.count}
                </p>
              </div>
            )}
          </div>

          <p className="font-bebas text-3xl text-white/90">
            {isMyBid ? 'YOUR TURN!' : `${players[currentBidder]?.nickname || '...'}'S TURN`}
          </p>

          {isMyBid ? (
            <div className="card p-4 sm:p-6 space-y-6 bg-offblack border-cyan">
              <p className="font-marker text-white/60 text-sm">What will you do?</p>
              
              {/* Bid Controls */}
              <div className="space-y-4">
                <div className="flex items-center gap-6 justify-center">
                  <button onClick={() => setBidCount(Math.max((state.currentBid?.count || 0) + 1, bidCount - 1))}
                    className="w-12 h-12 rounded-full border-2 border-yellow text-yellow text-2xl hover:bg-yellow hover:text-black font-bebas transition-colors">
                    −
                  </button>
                  <span className="font-bebas text-6xl text-yellow w-20 text-center">{Math.max((state.currentBid?.count || 0) + 1, bidCount)}</span>
                  <button onClick={() => setBidCount(Math.max((state.currentBid?.count || 0) + 1, bidCount) + 1)}
                    className="w-12 h-12 rounded-full border-2 border-yellow text-yellow text-2xl hover:bg-yellow hover:text-black font-bebas transition-colors">
                    +
                  </button>
                </div>
                <button id="btn-submit-bid" onClick={() => sendAction('SUBMIT_BID', { count: Math.max((state.currentBid?.count || 0) + 1, bidCount) })}
                  className="btn-primary w-full !bg-yellow !border-yellow !text-black text-xl py-3 animate-jitter">
                  BID HIGHER: {Math.max((state.currentBid?.count || 0) + 1, bidCount)}
                </button>
              </div>

              {/* Options if there's already a bid */}
              {state.currentBid ? (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => sendAction('DOUBLE_DARE')}
                    className="btn-primary py-3 text-sm !bg-magenta !border-magenta !text-white hover:animate-jitter col-span-2">
                    🎯 DOUBLE DARE!
                  </button>
                  <button onClick={() => sendAction('ACCEPT_BID')}
                    className="btn-primary py-3 text-sm !bg-lime !border-lime !text-black">
                    ✅ ACCEPT
                  </button>
                  <button onClick={() => sendAction('PASS_BID')}
                    className="btn-secondary py-3 text-sm">
                    PASS
                  </button>
                </div>
              ) : (
                <button onClick={() => sendAction('PASS_BID')}
                  className="btn-secondary w-full py-3 text-sm mt-4">
                  PASS (no bid yet)
                </button>
              )}
            </div>
          ) : (
            <p className="font-marker text-white/40 text-sm animate-pulse">
              Waiting for {players[currentBidder]?.nickname || '...'} to bid, dare, or pass...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Performance phase ─────────────────────────────────────────────────────
  if (state.phase === 'performing') {
    const bidder = state.currentBid ? players[state.currentBid.playerId] : null;
    const darer = state.doubledBy ? players[state.doubledBy] : null;
    const isBidder = playerId === state.currentBid?.playerId;

    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="w-full space-y-6 text-center animate-pop-in">
          <div className="card p-4 sm:p-6 bg-offblack border-yellow shadow-spray-sm flex flex-col gap-4">
            <div className="text-center">
              <p className="section-label text-yellow mb-1">CATEGORY</p>
              <p className="font-bebas text-3xl text-white">{state.topic}</p>
            </div>
            <div className="flex justify-center gap-8 border-t border-white/10 pt-4">
              <div className="text-center">
                <p className="section-label mb-1">TARGET</p>
                <p className="font-bebas text-5xl text-white">{state.currentBid?.count}</p>
              </div>
              <div className="text-center">
                <p className="section-label text-lime mb-1">GIVEN</p>
                <p className="font-bebas text-5xl text-lime">{(state.answers ?? []).length}</p>
              </div>
            </div>
          </div>

          {darer && (
            <p className="font-bebas text-2xl text-magenta">
              🎯 {darer.nickname} DOUBLE DARED {bidder?.nickname}!
            </p>
          )}

          {/* List of Answers */}
          <div className="flex flex-wrap gap-2 justify-center content-start">
            {(state.answers ?? []).map((a, i) => (
              <span key={i} className="tag-yellow text-lg px-3 py-1 bg-yellow text-black">{a}</span>
            ))}
            {(state.answers ?? []).length === 0 && <p className="font-marker text-white/30 text-sm w-full">Waiting for answers...</p>}
          </div>

          {isBidder && (
            <div className="card p-4 space-y-4 bg-offblack mt-4">
              <p className="font-marker text-white/60 text-sm">Say each answer out loud, then type it</p>
              <div className="flex gap-2">
                <input className="input-field flex-1 font-bebas text-xl" placeholder="NEXT ANSWER..."
                  value={answer} onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && answer.trim()) {
                      sendAction('SUBMIT_ANSWER', { answer: answer.trim() });
                      setAnswer('');
                    }
                  }} />
                <button onClick={() => { if (answer.trim()) { sendAction('SUBMIT_ANSWER', { answer: answer.trim() }); setAnswer(''); } }}
                  className="btn-primary px-6 text-2xl !bg-yellow !border-yellow !text-black">+</button>
              </div>
            </div>
          )}

          {isHost && (state.answers ?? []).length > 0 && (
            <div className="flex gap-3 justify-center mt-6">
              <button id="btn-vote-valid" onClick={() => sendAction('VOTE_ANSWER', { valid: true })}
                className="btn-primary flex-1 py-3 text-lg !bg-lime !border-lime !text-black">👍 VALID</button>
              <button id="btn-vote-invalid" onClick={() => sendAction('VOTE_ANSWER', { valid: false })}
                className="btn-danger flex-1 py-3 text-lg">👎 INVALID</button>
            </div>
          )}

          {!isBidder && (!isHost || (state.answers ?? []).length === 0) && (
            <p className="font-marker text-white/40 text-sm animate-pulse mt-4">
              Watch {bidder?.nickname} perform! Host will validate answers.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  if (state.phase === 'scoring') {
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-6 animate-pop-in">
          <h2 className="phase-banner text-yellow mb-4">ROUND {state.round}</h2>
          <div className="card p-4 sm:p-6 bg-offblack shadow-spray-sm border-spray max-w-sm mx-auto">
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p, i) => (
              <div key={p.id} className="score-row py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 font-bebas text-lg w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-base">{p.nickname}</span>
                <span className="font-bebas text-xl text-yellow">{state.scores[p.id] ?? 0} PTS</span>
              </div>
            ))}
          </div>
          {isHost && (
            <button onClick={() => sendAction('NEXT_ROUND')} className="btn-primary btn-lg w-full mt-4">
              {state.round >= state.maxRounds ? '🏆 SEE WINNER' : '▶ NEXT ROUND'}
            </button>
          )}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse mt-4">Waiting for host to continue...</p>}
        </div>
      </div>
    );
  }

  // ── Winner ─────────────────────────────────────────────────────────────────
  if (state.phase === 'winner') {
    const sorted = Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0));
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-7xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-yellow text-center mb-8" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
          {sorted[0]?.nickname} WINS!
        </h2>
        
        <div className="card p-6 shadow-magenta border-magenta w-full bg-offblack">
          {sorted.map((p,i) => (
            <div key={p.id} className="score-row py-2 border-b border-white/10 last:border-0">
              <span className="text-2xl w-8 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-2xl text-yellow">{state.scores[p.id]??0}</span>
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
