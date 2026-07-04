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
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 text-center max-w-lg px-6 animate-pop-in">
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
    const myClue = state.clueGrid.find((c) => c.playerId === playerId);
    const submitted = myClue?.clue !== null;
    const submittedCount = state.clueGrid.filter((c) => c.clue !== null).length;

    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        {isHost ? (
          <div className="relative z-10 w-full max-w-4xl px-8 text-center animate-pop-in">
            <div className="card p-8 mb-6 inline-block bg-offblack border-lime shadow-spray-sm">
              <p className="section-label mb-2">CATEGORY</p>
              <p className="font-bebas text-5xl text-white">{state.category}</p>
            </div>
            <p className="font-marker text-white/50 mb-8">CLUES SUBMITTED: {submittedCount}/{state.clueGrid.length}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {state.clueGrid.map((c) => {
                const player = players[c.playerId];
                return (
                  <div key={c.playerId} className={`card p-4 text-center transition-all bg-offblack
                    ${c.clue ? 'border-lime shadow-spray-sm' : 'border-white/10'}`}>
                    <p className="font-grotesk text-white/50 text-xs mb-2">{player?.nickname}</p>
                    {c.clue ? (
                      <p className="font-bebas text-2xl text-lime">"{c.clue}"</p>
                    ) : (
                      <div className="w-16 h-2 bg-white/10 rounded animate-pulse mx-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full space-y-6 animate-pop-in mt-8">
            <div className="card p-6 text-center border-white/20 bg-offblack shadow-magenta">
              <p className="section-label mb-2">CATEGORY</p>
              <p className="font-bebas text-3xl text-white">{state.category}</p>
            </div>
            <div className="card p-8 text-center border-lime shadow-spray-sm bg-offblack">
              <p className="section-label text-lime mb-2">YOUR WORD</p>
              <p className="font-bebas text-4xl text-white">{myPrivate?.word}</p>
              <p className="font-marker text-white/50 text-sm mt-3">Give a clue — but don't say the word!</p>
            </div>
            {!submitted ? (
              <ClueInput onSubmit={(clue) => sendAction('SUBMIT_CLUE', { clue })} />
            ) : (
              <div className="card p-4 text-center border-lime shadow-spray-sm bg-offblack">
                <p className="text-lime font-bebas text-2xl mb-1">✅ CLUE SUBMITTED</p>
                <p className="font-marker text-white/40 text-sm">Waiting for others...</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'voting') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        {isHost ? (
          <div className="relative z-10 w-full max-w-4xl px-8 text-center animate-pop-in">
            <h2 className="phase-banner text-magenta mb-2">WHO HAS A DIFFERENT WORD?</h2>
            <p className="font-marker text-white/50 mb-8">Discuss and cast your votes!</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {state.clueGrid.map((c) => {
                const player = players[c.playerId];
                const voteCount = Object.values(state.votes).filter((v) => v === c.playerId).length;
                return (
                  <div key={c.playerId} className={`card p-4 text-center bg-offblack ${voteCount > 0 ? 'border-magenta' : 'border-white/10'}`}>
                    <p className="font-bebas text-xl">{player?.nickname}</p>
                    <p className="text-lime text-2xl font-bebas mt-1">"{c.clue}"</p>
                    {voteCount > 0 && <div className="mt-2 flex justify-center gap-1">
                      {Array.from({ length: voteCount }).map((_, i) => <span key={i} className="text-magenta">❌</span>)}
                    </div>}
                  </div>
                );
              })}
            </div>
            <p className="font-marker text-white/40 pt-4">VOTES: {Object.keys(state.votes).length}/{state.clueGrid.length}</p>
          </div>
        ) : (
          <div className="relative z-10 w-full space-y-4 animate-pop-in mt-8">
            <h2 className="font-bebas text-3xl text-center text-magenta">WHO'S THE MOLE?</h2>
            <div className="space-y-3">
              {state.clueGrid.filter((c) => c.playerId !== playerId).map((c) => {
                const player = players[c.playerId];
                const voted = myVote === c.playerId;
                return (
                  <button key={c.playerId} id={`vote-mole-${c.playerId}`}
                    onClick={() => !myVote && sendAction('VOTE', { targetId: c.playerId })}
                    disabled={!!myVote}
                    className={`vote-ticket justify-between items-center
                      ${voted ? 'border-magenta bg-magenta/10' : ''}`}>
                    <div className="text-left flex-1">
                      <p className="font-bebas text-xl">{player?.nickname}</p>
                      <p className="font-marker text-white/50 text-sm">Said: "{c.clue}"</p>
                    </div>
                    {voted && <span className="tag-magenta ml-2 shrink-0">YOUR VOTE</span>}
                  </button>
                );
              })}
            </div>
            {myVote && <p className="text-white/40 text-center font-marker text-sm animate-pulse">Waiting for all votes...</p>}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'scoring') {
    return (
      <div className={isHost ? 'host-screen' : 'player-screen items-center justify-center p-6'}>
        <div className="relative z-10 w-full max-w-2xl px-6 text-center space-y-6 animate-pop-in">
          <div>
            <p className="text-6xl mb-4">🕵️</p>
            <h2 className="font-marker text-2xl text-white/60 mb-2">THE MOLE WAS...</h2>
            <p className="font-bebas text-6xl text-magenta mb-4" style={{ textShadow: '4px 4px 0 #F5E642' }}>
              {players[state.moleId]?.nickname}
            </p>
            {state.revealedWord && (
              <div className="mt-6 flex gap-4 justify-center">
                <div className="card p-4 border-lime shadow-spray-sm bg-offblack w-48">
                  <p className="section-label mb-2 text-lime">EVERYONE'S WORD</p>
                  <p className="font-bebas text-2xl text-white">{state.revealedWord}</p>
                </div>
                <div className="card p-4 border-magenta shadow-magenta bg-offblack w-48">
                  <p className="section-label mb-2 text-magenta">MOLE'S WORD</p>
                  <p className="font-bebas text-2xl text-white">{state.revealedMoleWord}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="card p-6 bg-offblack shadow-spray-sm border-spray max-w-md mx-auto mt-8">
            {Object.values(players).sort((a,b) => (state.scores[b.id]??0)-(state.scores[a.id]??0)).map((p,i) => (
              <div key={p.id} className="score-row">
                <span className="text-white/40 font-bebas text-xl w-6">{i+1}.</span>
                <span className="flex-1 text-left font-grotesk text-lg">{p.nickname}</span>
                <span className="font-bebas text-2xl text-lime">{state.scores[p.id]??0} PTS</span>
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
        <h2 className="phase-banner text-lime text-center mb-8" style={{ textShadow: '6px 6px 0 #FF2D78' }}>
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

function ClueInput({ onSubmit }: { onSubmit: (clue: string) => void }) {
  const [clue, setClue] = useState('');
  return (
    <div className="card p-4 space-y-4 bg-offblack shadow-cyan border-cyan">
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
