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
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
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
      <div className="player-screen p-6 justify-center">
        <div className="text-center">
          <div className="font-bebas text-5xl text-spray animate-pulse">GENERATING TRIVIA...</div>
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay') {
    const submitted = state.submittedBluffs[playerId ?? ''];
    const submittedCount = Object.values(state.submittedBluffs).filter(Boolean).length;

    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="w-full space-y-6 animate-pop-in">
          <div className="card p-6 border-cyan shadow-cyan text-center bg-offblack">
            <p className="section-label mb-2">THE QUESTION</p>
            <p className="font-bebas text-3xl sm:text-4xl text-white leading-tight">{state.question}</p>
          </div>
          
          {!submitted ? (
            <div className="card p-4 sm:p-6 space-y-4 bg-offblack border-magenta shadow-magenta">
              <p className="font-marker text-spray text-center text-sm">Write a convincing fake answer:</p>
              <input id="input-bluff" className="input-field text-center font-bebas text-2xl"
                placeholder="YOUR BLUFF..."
                value={bluffText} onChange={(e) => setBluffText(e.target.value)} maxLength={60}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bluffText.trim()) {
                    sendAction('SUBMIT_BLUFF', { bluff: bluffText.trim() });
                    setBluffText('');
                  }
                }} />
              <button id="btn-submit-bluff"
                onClick={() => { if (bluffText.trim()) { sendAction('SUBMIT_BLUFF', { bluff: bluffText.trim() }); setBluffText(''); } }}
                disabled={!bluffText.trim()} className="btn-primary w-full">
                SUBMIT BLUFF
              </button>
            </div>
          ) : (
            <div className="card p-6 text-center border-lime shadow-spray-sm bg-offblack">
              <p className="text-lime font-bebas text-2xl mb-2">✅ BLUFF SUBMITTED</p>
              <p className="font-marker text-white/40 text-sm mb-4">WAITING FOR BLUFFS: {submittedCount}/{Object.keys(players).length}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(players).map((p) => (
                  <div key={p.id} className={`card p-2 text-center font-grotesk text-xs
                    ${state.submittedBluffs[p.id] ? 'border-lime text-lime bg-lime/10' : 'border-white/10 text-white/40 bg-black/20'}`}>
                    {state.submittedBluffs[p.id] ? '✅' : '⏳'} {p.nickname}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'voting') {
    const myVote = state.votes[playerId ?? ''];
    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="w-full space-y-6 animate-pop-in">
          <div className="card p-4 sm:p-6 border-cyan shadow-cyan text-center bg-offblack">
            <h2 className="phase-banner text-spray text-3xl mb-2">WHICH IS REAL?</h2>
            <p className="font-bebas text-2xl text-white">{state.question}</p>
          </div>
          <div className="space-y-3">
            {state.answers.map((a) => {
              const voted = myVote === a.id;
              const voteCount = Object.values(state.votes).filter((v) => v === a.id).length;
              return (
                <button key={a.id} id={`vote-answer-${a.id}`}
                  onClick={() => !myVote && sendAction('VOTE', { answerId: a.id })}
                  disabled={!!myVote}
                  className={`vote-ticket justify-between w-full
                    ${voted ? 'vote-ticket-selected' : 'bg-offblack border-white/20'}`}>
                  <span className="font-bebas text-xl text-left truncate flex-1">{a.text}</span>
                  <div className="flex items-center gap-2">
                    {voted && <span className="tag-yellow">YOUR VOTE</span>}
                    {voteCount > 0 && <span className="text-cyan font-bebas text-lg">{voteCount} ❌</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {myVote && <p className="font-marker text-white/40 text-center text-sm animate-pulse mt-4">Waiting for all votes...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'scoring') {
    const realAnswer = state.answers.find((a) => a.id === state.realAnswerId);
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-6 animate-pop-in">
          <div className="card p-4 sm:p-6 border-lime shadow-spray-sm bg-offblack">
            <p className="section-label mb-2 text-lime">THE REAL ANSWER</p>
            <p className="font-bebas text-3xl sm:text-4xl text-white">{realAnswer?.text}</p>
          </div>
          
          <div className="space-y-3 max-w-sm mx-auto">
            {state.answers.filter((a) => a.id !== state.realAnswerId).map((a) => {
              const author = a.authorId === 'ai' ? 'AI' : a.authorId === 'real' ? 'System' : players[a.authorId]?.nickname;
              const fooled = Object.values(state.votes).filter((v) => v === a.id).length;
              return (
                <div key={a.id} className="card p-3 flex flex-col items-start text-sm bg-offblack border-white/10 text-left">
                  <div className="flex justify-between w-full items-start gap-2">
                    <span className="text-magenta font-bebas text-xl break-words flex-1">"{a.text}"</span>
                    {fooled > 0 && <span className="tag-magenta shrink-0">FOOLED {fooled}</span>}
                  </div>
                  <span className="font-marker text-white/40 mt-1">— {author}</span>
                </div>
              );
            })}
          </div>
          
          <div className="card p-4 sm:p-6 shadow-cyan border-cyan bg-offblack mt-6 max-w-sm mx-auto">
            <p className="section-label mb-3">SCORES</p>
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p,i) => (
              <div key={p.id} className="score-row py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 font-bebas text-xl w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-base">{p.nickname}</span>
                <span className="font-bebas text-2xl text-cyan">{state.scores[p.id]??0} PTS</span>
              </div>
            ))}
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
        <h2 className="phase-banner text-cyan text-center mb-8" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
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
