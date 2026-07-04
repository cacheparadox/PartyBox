import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { DoubleDareGameState } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId, privateData } = useRoomStore();
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
  const { state, players, isHost, playerId, sendAction } = useGame();
  const [bidCount, setBidCount] = useState(5);
  const [answer, setAnswer] = useState('');

  if (!state) return null;

  const currentBidder = state.biddingOrder[state.biddingIndex];
  const isMyBid = playerId === currentBidder;

  if (state.phase === 'instructions') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 text-center max-w-lg px-6 animate-pop-in">
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

  if (state.phase === 'gameplay' && !state.currentBid) {
    // Bidding phase
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 w-full max-w-2xl px-6 space-y-6 text-center animate-pop-in">
          <div className="card p-8 border-yellow shadow-spray-sm bg-offblack">
            <p className="section-label mb-2">TOPIC</p>
            <p className="font-bebas text-5xl text-yellow">{state.topic}</p>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <span className="tag-yellow text-lg px-4 py-1">{'⭐'.repeat(state.difficulty)} DIFFICULTY</span>
              <span className="tag-cyan text-lg px-4 py-1 text-black">⏱️ {state.roundTimeLimit} SECONDS</span>
            </div>
          </div>
          <p className="font-bebas text-2xl text-white/70">
            {players[currentBidder]?.nickname}'S TURN TO BID
          </p>
          {isMyBid && (
            <div className="card p-6 space-y-6 bg-offblack">
              <p className="font-marker text-white/60 text-lg">How many items can you name?</p>
              <div className="flex items-center gap-6 justify-center">
                <button onClick={() => setBidCount(Math.max(1, bidCount - 1))}
                  className="w-12 h-12 rounded-full border-2 border-yellow text-yellow text-2xl hover:bg-yellow hover:text-black font-bebas transition-colors">
                  −
                </button>
                <span className="font-bebas text-6xl text-yellow w-20 text-center">{bidCount}</span>
                <button onClick={() => setBidCount(bidCount + 1)}
                  className="w-12 h-12 rounded-full border-2 border-yellow text-yellow text-2xl hover:bg-yellow hover:text-black font-bebas transition-colors">
                  +
                </button>
              </div>
              <div className="pt-4">
                <button id="btn-submit-bid" onClick={() => sendAction('SUBMIT_BID', { count: bidCount })}
                  className="btn-primary w-full !bg-yellow !border-yellow !text-black text-2xl py-4 animate-jitter">
                  BID: {bidCount} ITEMS
                </button>
              </div>
            </div>
          )}
          {!isMyBid && (
            <p className="font-marker text-white/40 text-sm animate-pulse">Watching {players[currentBidder]?.nickname} bid...</p>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay' && state.currentBid && !state.doubledBy) {
    // Dare decision phase
    const bidder = players[state.currentBid.playerId];
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 w-full max-w-2xl px-6 space-y-6 text-center animate-pop-in">
          <div className="card p-8 bg-offblack border-cyan shadow-cyan">
            <p className="font-bebas text-white/70 text-2xl mb-2">
              {bidder?.nickname} BIDS:
            </p>
            <p className="font-bebas text-7xl text-cyan mb-2">
              {state.currentBid.count} ITEMS
            </p>
            <p className="font-bebas text-3xl text-white/50 mb-6">IN {state.roundTimeLimit} SECONDS</p>
            <div className="tag-cyan mx-auto inline-flex px-4 py-2">
              TOPIC: {state.topic}
            </div>
          </div>
          {playerId !== state.currentBid.playerId ? (
            <div className="space-y-4 pt-4">
              <p className="font-marker text-white/60 text-lg">Do you dare them?</p>
              <button id="btn-double-dare" onClick={() => sendAction('DOUBLE_DARE')}
                className="btn-primary w-full py-6 text-3xl !bg-magenta !border-magenta !text-white animate-jitter">
                🎯 DOUBLE DARE!
              </button>
              <p className="font-grotesk text-white/40 text-sm">Or wait for {bidder?.nickname} to accept</p>
            </div>
          ) : (
            <div className="pt-4">
              <button id="btn-accept-bid" onClick={() => sendAction('ACCEPT_BID')}
                className="btn-primary w-full py-6 text-3xl !bg-lime !border-lime !text-black animate-jitter">
                ✅ ACCEPT MY BID
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay' && state.doubledBy) {
    // Performance phase — answering
    const bidder = players[state.currentBid!.playerId];
    const darer = players[state.doubledBy];
    const isBidder = playerId === state.currentBid?.playerId;

    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 w-full max-w-3xl px-6 space-y-6 text-center animate-pop-in">
          <div className="flex flex-col md:flex-row items-center justify-between card p-6 bg-offblack border-yellow shadow-spray-sm gap-4">
            <div className="text-center md:text-left">
              <p className="section-label text-yellow mb-1">CATEGORY</p>
              <p className="font-bebas text-3xl text-white">{state.topic}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="section-label mb-1">TARGET</p>
                <p className="font-bebas text-5xl text-white">{state.currentBid?.count}</p>
              </div>
              <div className="text-center">
                <p className="section-label text-lime mb-1">GIVEN</p>
                <p className="font-bebas text-5xl text-lime">{state.answers.length}</p>
              </div>
            </div>
          </div>
          {isHost && (
            <div className="flex flex-wrap gap-3 justify-center min-h-[100px] content-start">
              {state.answers.map((a, i) => (
                <span key={i} className="tag-yellow text-xl px-4 py-2 bg-yellow text-black">{a}</span>
              ))}
              {state.answers.length === 0 && <p className="font-marker text-white/30 text-xl w-full">Waiting for answers...</p>}
            </div>
          )}
          {isBidder && (
            <div className="card p-6 space-y-4 bg-offblack">
              <p className="font-marker text-white/60 text-lg">Say each answer out loud, then type it</p>
              <div className="flex gap-3">
                <input className="input-field flex-1 font-bebas text-2xl" placeholder="NEXT ANSWER..."
                  value={answer} onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && answer.trim()) {
                      sendAction('SUBMIT_ANSWER', { answer: answer.trim() });
                      setAnswer('');
                    }
                  }} />
                <button onClick={() => { if (answer.trim()) { sendAction('SUBMIT_ANSWER', { answer: answer.trim() }); setAnswer(''); } }}
                  className="btn-primary px-8 text-3xl !bg-yellow !border-yellow !text-black">+</button>
              </div>
            </div>
          )}
          {isHost && state.answers.length > 0 && (
            <div className="flex gap-4 justify-center mt-8">
              <button id="btn-vote-valid" onClick={() => sendAction('VOTE_ANSWER', { valid: true })}
                className="btn-primary flex-1 py-4 text-2xl !bg-lime !border-lime !text-black">👍 VALID</button>
              <button id="btn-vote-invalid" onClick={() => sendAction('VOTE_ANSWER', { valid: false })}
                className="btn-danger flex-1 py-4 text-2xl">👎 INVALID</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'scoring') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 w-full max-w-md px-6 text-center space-y-6 animate-pop-in">
          <h2 className="phase-banner text-yellow mb-4">ROUND {state.round}</h2>
          <div className="card p-6 bg-offblack shadow-spray-sm border-spray">
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p, i) => (
              <div key={p.id} className="score-row">
                <span className="text-white/40 font-bebas text-xl w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-lg">{p.nickname}</span>
                <span className="font-bebas text-2xl text-yellow">{state.scores[p.id] ?? 0} PTS</span>
              </div>
            ))}
          </div>
          {isHost && (
            <button onClick={() => sendAction('NEXT_ROUND')} className="btn-primary btn-lg btn-full">
              {state.round >= state.maxRounds ? '🏆 SEE WINNER' : '▶ NEXT ROUND'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'winner') {
    const sorted = Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0));
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const hostId = useRoomStore((s) => s.hostId) ?? '';
    return (
      <div className="host-screen">
        <div className="text-8xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-yellow text-center mb-8" style={{ textShadow: '6px 6px 0 #FF2D78' }}>
          {sorted[0]?.nickname} WINS!
        </h2>
        
        <div className="card p-8 shadow-magenta border-magenta w-full max-w-md mx-auto mb-8 bg-offblack">
          {sorted.map((p,i) => (
            <div key={p.id} className="score-row py-3">
              <span className="text-3xl w-10 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-2xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-3xl text-yellow">{state.scores[p.id]??0}</span>
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
