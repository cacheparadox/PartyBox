import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { ChameleonGameState } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId, privateData } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as ChameleonGameState | null;

  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }

  return { state, players, isHost, playerId, privateData, sendAction, roomCode };
}

export default function ChameleonView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';

  if (!state) return null;

  const myPrivate = privateData as { role?: string; word?: string } | null;
  const isChameleon = myPrivate?.role === 'chameleon';

  // ── Instructions Phase ──
  if (state.phase === 'instructions') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🦎</div>
          <h1 className="phase-banner text-lime mb-4">CHAMELEON</h1>
          <p className="font-grotesk text-white/60 mb-8 text-lg">
            Everyone sees a category and a secret word — except <strong className="text-magenta">one player</strong>.
            That player is the Chameleon. Give clues that prove you know the word without giving it away.
          </p>
          {isHost && (
            <button
              id="btn-start-chameleon"
              onClick={() => sendAction('START_ROUND')}
              className="btn-primary btn-lg btn-full"
            >
              START ROUND
            </button>
          )}
          {!isHost && (
            <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host to start...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Gameplay Phase (clue submission) ──
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

          <p className="font-marker text-white/50 text-center text-sm">
            CLUES SUBMITTED: {submittedCount}/{state.clueGrid.length}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {state.clueGrid.map((c) => {
              const player = players[c.playerId];
              const isMe = c.playerId === playerId;
              return (
                <div
                  key={c.playerId}
                  className={`card p-3 text-center transition-all bg-offblack ${c.clue ? 'border-lime' : 'border-white/10'}`}
                >
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
          <div
            className={`card p-6 text-center relative overflow-hidden bg-offblack mt-4
              ${isChameleon ? 'border-magenta shadow-magenta' : 'border-lime shadow-spray-sm'}`}
          >
            {isChameleon ? (
              <div className="relative z-10">
                <p className="text-5xl mb-3">🦎</p>
                <p className="section-label text-magenta mb-1">YOU ARE THE</p>
                <p className="font-bebas text-4xl text-magenta">CHAMELEON</p>
                <p className="font-marker text-white/50 text-sm mt-3">Blend in! Give a convincing clue.</p>
              </div>
            ) : (
              <div className="relative z-10">
                <p className="section-label text-lime mb-2">SECRET WORD</p>
                <p className="font-bebas text-4xl text-lime">{myPrivate?.word}</p>
                <p className="font-marker text-white/50 text-sm mt-2">Don't say the word directly!</p>
              </div>
            )}
          </div>

          {!submitted ? (
            <ClueInput onSubmit={(clue) => sendAction('SUBMIT_CLUE', { clue })} />
          ) : (
            <div className="card p-4 text-center border-lime bg-offblack mt-4">
              <p className="text-lime font-bebas text-2xl mb-1">✅ CLUE SUBMITTED</p>
              <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for others...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Voting Phase ──
  if (state.phase === 'voting') {
    const myVote = state.votes[playerId ?? ''];

    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        <div className="animate-pop-in space-y-4 w-full">
          <h2 className="phase-banner text-magenta text-center text-4xl">WHO IS THE CHAMELEON?</h2>
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
                <button
                  key={c.playerId}
                  id={`vote-${c.playerId}`}
                  onClick={() => !myVote && sendAction('VOTE', {
                    targetId: c.playerId,
                    correctWord: isChameleon ? '' : (myPrivate?.word ?? ''),
                  })}
                  disabled={!!myVote}
                  className={`vote-ticket justify-between items-center w-full transition-all
                    ${votedByMe ? 'border-magenta bg-magenta/10 shadow-magenta' : 'border-white/20 bg-offblack'}`}
                >
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
          {myVote && (
            <p className="text-white/40 text-center font-marker text-sm animate-pulse mt-4">
              Waiting for all votes...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Chameleon Guess Phase ──
  if (state.phase === 'chameleon-guess') {
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full max-w-sm text-center space-y-6 animate-pop-in mx-auto">
          <p className="text-6xl animate-float">🦎</p>
          <h2 className="phase-banner text-magenta text-4xl">CHAMELEON CAUGHT!</h2>
          <p className="font-grotesk text-white/60">
            <strong className="text-spray">{players[state.chameleonId]?.nickname}</strong> must guess the secret word to save themselves!
          </p>
          {isChameleon ? (
            <ChameleonGuessInput onSubmit={(g) => sendAction('CHAMELEON_GUESS', { guess: g })} />
          ) : (
            <div className="card p-6 bg-offblack border-lime shadow-spray-sm mt-4">
              <p className="font-marker text-white/60 text-sm mb-2">The secret word was:</p>
              <p className="font-bebas text-4xl text-lime">{state.revealedWord ?? '???'}</p>
              <p className="font-marker text-white/40 text-sm mt-4 animate-pulse">Waiting for chameleon's guess...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === 'scoring') {
    const sortedPlayers = Object.values(players).sort(
      (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
    );
    const chameleonPlayer = players[state.chameleonId];

    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-6 animate-pop-in">
          <div>
            <p className="text-6xl mb-4 animate-float">🦎</p>
            <h2 className="font-marker text-xl text-white/60 mb-2">THE CHAMELEON WAS...</h2>
            <p className="font-bebas text-5xl text-magenta mb-4" style={{ textShadow: '4px 4px 0 #F5E642' }}>
              {chameleonPlayer?.nickname}
            </p>
            
            {state.chameleonGuessedRight != null && (
              <div className={`card p-4 mx-auto max-w-sm mt-4 ${state.chameleonGuessedRight ? 'bg-lime text-black' : 'bg-magenta text-white'}`}>
                <p className="font-bebas text-2xl mb-1">
                  {state.chameleonGuessedRight ? 'THEY GUESSED RIGHT!' : 'THEY GUESSED WRONG!'}
                </p>
                <p className="font-marker text-sm opacity-80">
                  {state.chameleonGuessedRight ? 'The Chameleon escaped.' : 'The players win this round.'}
                </p>
              </div>
            )}
          </div>

          <div className="card p-4 bg-offblack shadow-spray-sm border-spray max-w-sm mx-auto mt-6">
            <p className="section-label mb-3">SCORES</p>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="score-row py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 font-bebas text-lg w-6">{i + 1}.</span>
                <span className="flex-1 text-left font-grotesk text-base">{p.nickname}</span>
                <span className="font-bebas text-xl text-lime">{state.scores[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
          {isHost && (
            <button
              onClick={() => sendAction('NEXT_ROUND')}
              className="btn-primary btn-lg w-full mt-4"
            >
              {state.round >= state.maxRounds ? '🏆 SEE WINNER' : '▶ NEXT ROUND'}
            </button>
          )}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse mt-4">Waiting for host to continue...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'winner') {
    const sorted = Object.values(players).sort(
      (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0)
    );
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-7xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-lime text-center mb-8" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
          {sorted[0]?.nickname} WINS!
        </h2>

        <div className="card p-6 shadow-magenta border-magenta w-full bg-offblack">
          {sorted.map((p, i) => (
            <div key={p.id} className="score-row py-2 border-b border-white/10 last:border-0">
              <span className="text-2xl w-8 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span className="flex-1 font-bebas text-xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-2xl text-magenta">{state.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>

        {isHost && (
          <button
            onClick={async () => {
              await callEndGame({ roomCode: roomCode!, requestingPlayerId: hostId });
              navigate(`/lobby/${roomCode}`);
            }}
            className="btn-primary btn-lg w-full mt-8"
          >
            🔁 RETURN TO LOBBY
          </button>
        )}
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
      <input
        id="input-chameleon-clue"
        className="input-field text-center font-bebas text-2xl"
        placeholder="YOUR CLUE..."
        value={clue}
        onChange={(e) => setClue(e.target.value)}
        maxLength={30}
        onKeyDown={(e) => e.key === 'Enter' && clue.trim() && (onSubmit(clue.trim()), setClue(''))}
      />
      <button
        id="btn-submit-chameleon-clue"
        onClick={() => { if (clue.trim()) { onSubmit(clue.trim()); setClue(''); } }}
        disabled={!clue.trim()}
        className="btn-primary w-full"
      >
        SUBMIT CLUE
      </button>
    </div>
  );
}

function ChameleonGuessInput({ onSubmit }: { onSubmit: (g: string) => void }) {
  const [guess, setGuess] = useState('');
  return (
    <div className="card p-4 space-y-4 bg-offblack shadow-magenta border-magenta mt-6">
      <input
        className="input-field text-center font-bebas text-2xl"
        placeholder="GUESS THE WORD..."
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        maxLength={30}
        onKeyDown={(e) => e.key === 'Enter' && guess.trim() && (onSubmit(guess.trim()), setGuess(''))}
      />
      <button
        onClick={() => { if (guess.trim()) { onSubmit(guess.trim()); setGuess(''); } }}
        disabled={!guess.trim()}
        className="btn-primary w-full"
        style={{ backgroundColor: '#FF2D78', color: '#fff', border: 'none' }}
      >
        GUESS WORD
      </button>
    </div>
  );
}
