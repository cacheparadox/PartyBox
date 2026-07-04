import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { BuildABluffGameState, BluffAnswer } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as BuildABluffGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, sendAction, roomCode };
}

export default function BuildABluffView() {
  const { state, players, isHost, playerId, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [bluffText, setBluffText] = useState('');

  if (!state) return null;

  if (state.phase === 'instructions') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 text-center max-w-lg px-6 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🎭</div>
          <h1 className="phase-banner text-cyan mb-4">BUILD A BLUFF</h1>
          <p className="font-grotesk text-white/60 mb-8 text-lg">
            A trivia question appears. Submit a <strong className="text-spray">convincing fake answer</strong>.
            Vote for what you think is real. Score points for finding truth and fooling others!
          </p>
          {isHost && <button id="btn-start-bab" onClick={() => sendAction('START_ROUND')}
            className="btn-primary btn-lg btn-full">START ROUND</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'round-start') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 text-center">
          <div className="font-bebas text-5xl text-spray animate-pulse">GENERATING TRIVIA...</div>
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay') {
    const submitted = state.submittedBluffs[playerId ?? ''];
    const submittedCount = Object.values(state.submittedBluffs).filter(Boolean).length;

    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        {isHost ? (
          <div className="relative z-10 w-full max-w-3xl px-8 text-center space-y-8 animate-pop-in">
            <div className="card p-8 border-cyan shadow-cyan">
              <p className="section-label mb-3">THE QUESTION</p>
              <p className="font-bebas text-4xl text-white">{state.question}</p>
            </div>
            <p className="font-marker text-white/50">WAITING FOR BLUFFS: {submittedCount}/{Object.keys(players).length}</p>
            <div className="grid grid-cols-4 gap-4">
              {Object.values(players).map((p) => (
                <div key={p.id} className={`card p-3 text-center font-grotesk text-sm
                  ${state.submittedBluffs[p.id] ? 'border-lime text-lime shadow-spray-sm' : 'border-white/10 text-white/40'}`}>
                  {state.submittedBluffs[p.id] ? '✅' : '⏳'} {p.nickname}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full space-y-6 animate-pop-in">
            <div className="card p-6 border-cyan shadow-cyan text-center">
              <p className="section-label mb-2">THE QUESTION</p>
              <p className="font-bebas text-2xl text-white">{state.question}</p>
            </div>
            {!submitted ? (
              <div className="card p-6 space-y-4">
                <p className="font-marker text-spray text-center text-sm">Write a convincing fake answer:</p>
                <input id="input-bluff" className="input-field text-center font-bebas text-2xl"
                  placeholder="YOUR BLUFF..."
                  value={bluffText} onChange={(e) => setBluffText(e.target.value)} maxLength={60} />
                <button id="btn-submit-bluff"
                  onClick={() => { if (bluffText.trim()) { sendAction('SUBMIT_BLUFF', { bluff: bluffText.trim() }); setBluffText(''); } }}
                  disabled={!bluffText.trim()} className="btn-primary w-full">
                  SUBMIT BLUFF
                </button>
              </div>
            ) : (
              <div className="card p-6 text-center border-lime shadow-spray-sm">
                <p className="text-lime font-bebas text-2xl mb-2">✅ BLUFF SUBMITTED</p>
                <p className="font-marker text-white/40 text-sm">Waiting for others... ({submittedCount}/{Object.keys(players).length})</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'voting') {
    const myVote = state.votes[playerId ?? ''];
    return (
      <div className={isHost ? 'host-screen' : 'player-screen p-6'}>
        {isHost ? (
          <div className="relative z-10 w-full max-w-3xl px-8 text-center space-y-6 animate-pop-in">
            <h2 className="phase-banner text-spray">WHICH IS REAL?</h2>
            <p className="font-bebas text-2xl text-white/70">{state.question}</p>
            <div className="space-y-4 pt-4">
              {state.answers.map((a) => {
                const voteCount = Object.values(state.votes).filter((v) => v === a.id).length;
                return (
                  <div key={a.id} className={`card p-4 flex items-center justify-between
                    ${voteCount > 0 ? 'border-cyan shadow-cyan' : 'border-white/10'}`}>
                    <p className="font-bebas text-2xl text-white">{a.text}</p>
                    {voteCount > 0 && <span className="tag-cyan">{voteCount} VOTES</span>}
                  </div>
                );
              })}
            </div>
            <p className="font-marker text-white/40 pt-4">VOTES: {Object.keys(state.votes).length}/{Object.keys(players).length}</p>
          </div>
        ) : (
          <div className="relative z-10 w-full space-y-6 animate-pop-in mt-8">
            <h2 className="font-bebas text-4xl text-center text-spray">WHICH IS REAL?</h2>
            <p className="font-grotesk text-white/60 text-center text-sm">{state.question}</p>
            <div className="space-y-3">
              {state.answers.map((a) => {
                const voted = myVote === a.id;
                return (
                  <button key={a.id} id={`vote-answer-${a.id}`}
                    onClick={() => !myVote && sendAction('VOTE', { answerId: a.id })}
                    disabled={!!myVote}
                    className={`vote-ticket justify-between
                      ${voted ? 'vote-ticket-selected' : ''}`}>
                    <span className="font-bebas text-xl text-left truncate">{a.text}</span>
                    {voted && <span className="tag-yellow ml-2">YOUR VOTE</span>}
                  </button>
                );
              })}
            </div>
            {myVote && <p className="font-marker text-white/40 text-center text-sm animate-pulse">Waiting for all votes...</p>}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'scoring') {
    const realAnswer = state.answers.find((a) => a.id === state.realAnswerId);
    return (
      <div className={isHost ? 'host-screen' : 'player-screen p-6'}>
        <div className="relative z-10 w-full max-w-2xl px-6 text-center space-y-6 animate-pop-in">
          <div className="card p-6 border-lime shadow-spray-sm bg-offblack">
            <p className="section-label mb-2 text-lime">THE REAL ANSWER</p>
            <p className="font-bebas text-4xl text-white">{realAnswer?.text}</p>
          </div>
          
          <div className="space-y-3">
            {state.answers.filter((a) => a.id !== state.realAnswerId).map((a) => {
              const author = a.authorId === 'ai' ? 'AI' : a.authorId === 'real' ? 'System' : players[a.authorId]?.nickname;
              const fooled = Object.values(state.votes).filter((v) => v === a.id).length;
              return (
                <div key={a.id} className="card p-4 flex items-center justify-between text-sm bg-offblack">
                  <div className="text-left">
                    <span className="text-magenta font-bebas text-xl">"{a.text}"</span>
                    <span className="font-marker text-white/40 ml-3">— {author}</span>
                  </div>
                  {fooled > 0 && <span className="tag-magenta">FOOLED {fooled}</span>}
                </div>
              );
            })}
          </div>
          
          <div className="card p-6 shadow-cyan border-cyan bg-offblack mt-8">
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p,i) => (
              <div key={p.id} className="score-row">
                <span className="text-white/40 font-bebas text-xl w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-lg">{p.nickname}</span>
                <span className="font-bebas text-2xl text-cyan">{state.scores[p.id]??0} PTS</span>
              </div>
            ))}
          </div>
          {isHost && <button onClick={() => sendAction('NEXT_ROUND')} className="btn-primary btn-lg btn-full">
            {state.round >= state.maxRounds ? '🏆 SEE WINNER' : '▶ NEXT ROUND'}</button>}
        </div>
      </div>
    );
  }

  if (state.phase === 'winner') {
    const sorted = Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0));
    return (
      <div className="host-screen">
        <div className="text-8xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-cyan text-center mb-8" style={{ textShadow: '6px 6px 0 #FF2D78' }}>
          {sorted[0]?.nickname} WINS!
        </h2>
        
        <div className="card p-8 shadow-magenta border-magenta w-full max-w-md mx-auto mb-8 bg-offblack">
          {sorted.map((p,i) => (
            <div key={p.id} className="score-row py-3">
              <span className="text-3xl w-10 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-2xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-3xl text-magenta">{state.scores[p.id]??0}</span>
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
