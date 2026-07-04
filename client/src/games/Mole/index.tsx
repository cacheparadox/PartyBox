import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { MoleGameState } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId, privateData } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as MoleGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, privateData, sendAction, roomCode };
}

export default function MoleView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';

  if (!state) return null;
  const myPrivate = privateData as { word?: string } | null;
  const myVote = state.votes[playerId ?? ''];

  if (state.phase === 'instructions') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🕵️</div>
          <h1 className="phase-banner text-magenta mb-4">MOLE</h1>
          <p className="font-grotesk text-white/60 mb-8 text-lg">
            Everyone gets a secret word — but one player unknowingly receives a <strong className="text-magenta">different</strong> related word.
            Can you find the Mole before they realize they are one?
          </p>
          {isHost && <button id="btn-start-mole" onClick={() => sendAction('START_ROUND')}
            className="btn-primary btn-lg btn-full">START ROUND</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay' || state.phase === 'round-start') {
    const myClue = (state.clueGrid ?? []).find((c) => c.playerId === playerId);
    const submitted = myClue?.clue != null;
    const submittedCount = (state.clueGrid ?? []).filter((c) => c.clue != null).length;

    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="animate-pop-in space-y-6 w-full">
          {/* Board */}
          <div className="card p-4 sm:p-6 text-center border-lime bg-offblack shadow-spray-sm">
            <p className="section-label mb-1">CATEGORY</p>
            <p className="font-bebas text-4xl text-white">{state.category}</p>
          </div>

          <p className="font-marker text-white/50 text-center text-sm">CLUES SUBMITTED: {submittedCount}/{state.clueGrid.length}</p>
          <div className="grid grid-cols-2 gap-3">
            {state.clueGrid.map((c) => {
              const player = players[c.playerId];
              const isMe = c.playerId === playerId;
              return (
                <div key={c.playerId} className={`card p-3 text-center transition-all bg-offblack ${c.clue ? 'border-lime' : 'border-white/10'}`}>
                  <p className="font-grotesk text-white/50 text-xs mb-1">{isMe ? 'YOU' : player?.nickname}</p>
                  {c.clue ? (
                    <p className="font-bebas text-xl text-lime break-words">"{c.clue}"</p>
                  ) : (
                    <div className="w-8 h-1.5 bg-white/10 rounded animate-pulse mx-auto mt-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Private Controls */}
          <div className="card p-6 text-center border-magenta shadow-magenta bg-offblack mt-4">
            <p className="section-label text-magenta mb-2">YOUR SECRET WORD</p>
            <p className="font-bebas text-4xl text-white">{myPrivate?.word}</p>
            <p className="font-marker text-white/50 text-sm mt-3">Give a clue — but don't say the word!</p>
          </div>

          {!submitted ? (
            <ClueInput onSubmit={(clue) => sendAction('SUBMIT_CLUE', { clue })} />
          ) : (
            <div className="card p-4 text-center border-lime bg-offblack">
              <p className="text-lime font-bebas text-2xl mb-1">✅ CLUE SUBMITTED</p>
              <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for others...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'voting') {
    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="animate-pop-in space-y-4 w-full">
          <h2 className="phase-banner text-magenta text-center text-4xl">WHO'S THE MOLE?</h2>
          <p className="font-marker text-white/50 text-center text-sm">VOTES: {Object.keys(state.votes).length}/{state.clueGrid.length}</p>
          
          <div className="space-y-3 mt-4">
            {state.clueGrid.map((c) => {
              const player = players[c.playerId];
              const isMe = c.playerId === playerId;
              const voteCount = Object.values(state.votes).filter((v) => v === c.playerId).length;
              const votedByMe = myVote === c.playerId;

              if (isMe) {
                return (
                  <div key={c.playerId} className="card p-4 bg-offblack border-white/20 opacity-70">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bebas text-lg text-white/50">YOU</p>
                        <p className="font-marker text-white/40 text-sm">Said: "{c.clue}"</p>
                      </div>
                      {voteCount > 0 && <span className="text-magenta font-bebas text-xl">{voteCount} ❌</span>}
                    </div>
                  </div>
                );
              }

              return (
                <button key={c.playerId} id={`vote-mole-${c.playerId}`}
                  onClick={() => !myVote && sendAction('VOTE', { targetId: c.playerId })}
                  disabled={!!myVote}
                  className={`vote-ticket justify-between items-center w-full transition-all
                    ${votedByMe ? 'border-magenta bg-magenta/10 shadow-magenta' : 'border-white/20 bg-offblack'}`}>
                  <div className="text-left flex-1">
                    <p className="font-bebas text-xl">{player?.nickname}</p>
                    <p className="font-marker text-white/60 text-sm">Said: "{c.clue}"</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {votedByMe && <span className="tag-magenta text-[10px]">YOUR VOTE</span>}
                    {voteCount > 0 && <span className="text-magenta font-bebas text-xl">{voteCount} ❌</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {myVote && <p className="text-white/40 text-center font-marker text-sm animate-pulse mt-4">Waiting for all votes...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'scoring') {
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-6 animate-pop-in">
          <div>
            <p className="text-6xl mb-4 animate-float">🕵️</p>
            <h2 className="font-marker text-xl text-white/60 mb-2">THE MOLE WAS...</h2>
            <p className="font-bebas text-5xl text-magenta mb-4" style={{ textShadow: '4px 4px 0 #F5E642' }}>
              {players[state.moleId]?.nickname}
            </p>
            
            {state.revealedWord && (
              <div className="mt-6 flex flex-col gap-3 justify-center max-w-sm mx-auto">
                <div className="card p-3 border-lime shadow-spray-sm bg-offblack w-full flex justify-between items-center">
                  <p className="section-label text-lime">EVERYONE'S WORD</p>
                  <p className="font-bebas text-xl text-white">{state.revealedWord}</p>
                </div>
                <div className="card p-3 border-magenta shadow-magenta bg-offblack w-full flex justify-between items-center">
                  <p className="section-label text-magenta">MOLE'S WORD</p>
                  <p className="font-bebas text-xl text-white">{state.revealedMoleWord}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="card p-4 bg-offblack shadow-spray-sm border-spray max-w-sm mx-auto mt-6">
            <p className="section-label mb-3">SCORES</p>
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p,i) => (
              <div key={p.id} className="score-row py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 font-bebas text-lg w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-base">{p.nickname}</span>
                <span className="font-bebas text-xl text-lime">{state.scores[p.id]??0}</span>
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
        <h2 className="phase-banner text-lime text-center mb-8" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
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

function ClueInput({ onSubmit }: { onSubmit: (clue: string) => void }) {
  const [clue, setClue] = useState('');
  return (
    <div className="card p-4 space-y-4 bg-offblack shadow-cyan border-cyan mt-4">
      <input id="input-mole-clue" className="input-field text-center font-bebas text-2xl"
        placeholder="YOUR CLUE..." value={clue} onChange={(e) => setClue(e.target.value)} maxLength={30}
        onKeyDown={(e) => e.key === 'Enter' && clue.trim() && (onSubmit(clue.trim()), setClue(''))} />
      <button id="btn-submit-mole-clue" onClick={() => { if (clue.trim()) { onSubmit(clue.trim()); setClue(''); } }}
        disabled={!clue.trim()} className="btn-primary w-full">
        SUBMIT CLUE
      </button>
    </div>
  );
}
