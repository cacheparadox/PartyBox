import { useState } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { RGWGameState, RGWQuestion } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

function useGame() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { gameState, players, hostId, privateData } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const isHost = playerId === hostId;
  const state = gameState as RGWGameState | null;
  async function sendAction(action: string, data: Record<string, unknown> = {}) {
    if (!roomCode || !playerId) return;
    await callPlayerAction({ roomCode, action, data, playerId });
  }
  return { state, players, isHost, playerId, privateData, sendAction, roomCode };
}

export default function ReverseGuessWhoView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');

  if (!state) return null;

  const myPrivate = privateData as { identity?: string } | null;
  const isHolder = playerId === state.identityHolderId;
  const isBuzzer = playerId === state.buzzerId;
  const mySkipVote = state.skipVotes?.[playerId ?? ''];
  // Firebase drops null → comes back as undefined; use != null
  const unansweredQ = (state.questions ?? []).filter((q) => q.answer == null && q.askerId !== state.identityHolderId);

  if (state.phase === 'instructions') {
    return (
      <div className="player-screen p-6 justify-center">
        <div className="text-center max-w-lg px-2 animate-pop-in">
          <div className="text-7xl mb-6 animate-float">🌟</div>
          <h1 className="phase-banner text-magenta mb-4">REVERSE GUESS WHO</h1>
          <p className="text-white/60 mb-8 font-grotesk text-lg">
            One player holds a <strong className="text-spray">secret famous person</strong> identity.
            Others ask yes/no questions to figure out who. Buzz in to guess — fewer questions = more points!
          </p>
          {isHost && <button id="btn-start-rgw" onClick={() => sendAction('START_ROUND')}
            className="btn-primary btn-lg btn-full">START ROUND</button>}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  if (state.phase === 'gameplay') {
    return (
      <div className="player-screen p-4 sm:p-6 gap-6">
        {isHolder ? (
          // Identity holder view
          <div className="w-full space-y-4 animate-pop-in">
            <div className="card p-6 text-center border-spray shadow-spray bg-offblack">
              <p className="section-label mb-2 text-spray">YOU ARE</p>
              <p className="font-bebas text-4xl sm:text-5xl text-white mb-2">{myPrivate?.identity}</p>
              <p className="font-marker text-white/60 text-sm">Category: {state.identityCategory}</p>
            </div>
            
            {state.buzzerId && (
              <div className="card p-6 border-spray shadow-spray text-center bg-offblack">
                <p className="text-spray font-bebas text-3xl mb-2">
                  🔔 {players[state.buzzerId]?.nickname} BUZZED IN!
                </p>
                {state.buzzerGuess ? (
                  <div className="mt-4 space-y-4">
                    <p className="text-white font-grotesk text-lg">Guessing: <strong className="text-spray text-xl">{state.buzzerGuess}</strong></p>
                    <div className="flex gap-3 justify-center">
                      <button id="btn-correct" onClick={() => sendAction('CONFIRM_GUESS', { correct: true, revealedIdentity: myPrivate?.identity ?? '' })}
                        className="btn-primary flex-1">✅ CORRECT</button>
                      <button id="btn-wrong" onClick={() => sendAction('CONFIRM_GUESS', { correct: false, revealedIdentity: myPrivate?.identity ?? '' })}
                        className="btn-secondary text-magenta border-magenta flex-1">❌ WRONG</button>
                    </div>
                  </div>
                ) : (
                  <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for their guess...</p>
                )}
              </div>
            )}

            <div className="card p-4 space-y-3 max-h-72 overflow-y-auto bg-offblack">
              <p className="section-label mb-2">QUESTIONS TO ANSWER</p>
              {unansweredQ.length === 0 ? (
                <p className="text-white/30 text-sm text-center font-grotesk py-4">No questions yet...</p>
              ) : unansweredQ.map((q) => (
                <div key={q.id} className="card p-4 border-white/20 bg-offblack">
                  <p className="text-sm font-grotesk mb-3">
                    <strong className="text-magenta">{players[q.askerId]?.nickname}:</strong> <span className="text-white/90">{q.text}</span>
                  </p>
                  <div className="flex gap-2">
                    <button id={`answer-yes-${q.id}`} onClick={() => sendAction('ANSWER_QUESTION', { questionId: q.id, answer: 'yes' })}
                      className="btn-primary flex-1 py-2 text-sm !bg-lime !border-lime !text-black">
                      YES
                    </button>
                    <button id={`answer-no-${q.id}`} onClick={() => sendAction('ANSWER_QUESTION', { questionId: q.id, answer: 'no' })}
                      className="btn-danger flex-1 py-2 text-sm">
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="card p-4 bg-offblack mt-4">
              <p className="section-label mb-2">Q&A HISTORY ({state.questions.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto font-grotesk">
                {state.questions.map((q) => (
                  <div key={q.id} className="text-xs border-b border-white/5 pb-2">
                    <span className="text-white/50">{players[q.askerId]?.nickname}: </span>
                    <span className="text-white/80">{q.text}</span>
                    {q.answer && (
                      <span className={`ml-2 font-bold ${q.answer === 'yes' ? 'text-lime' : 'text-magenta'}`}>
                        → {q.answer === 'yes' ? 'YES' : 'NO'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!mySkipVote && !state.buzzerId && (
              <button id="btn-skip" onClick={() => sendAction('VOTE_SKIP')}
                className="btn-secondary w-full border-spray text-spray mt-4">
                ⏭ REQUEST SKIP (DON'T KNOW THEM)
              </button>
            )}
            {mySkipVote && <p className="font-marker text-white/40 text-center text-sm mt-4 animate-pulse">Skip requested... ({Object.keys(state.skipVotes).length} votes)</p>}
          </div>
        ) : (
          // Questioner view
          <div className="w-full space-y-4 animate-pop-in">
            <div className="card p-4 text-center bg-offblack border-white/20">
              <p className="section-label mb-1">GUESSING</p>
              <p className="font-bebas text-3xl sm:text-4xl text-spray leading-none">{players[state.identityHolderId]?.nickname}</p>
              <p className="font-marker text-white/60 text-sm mt-1">Category: <strong>{state.identityCategory}</strong></p>
            </div>

            {/* Q&A log */}
            <div className="card p-4 space-y-2 max-h-56 overflow-y-auto font-grotesk bg-offblack">
              <p className="section-label mb-2 text-white/40 text-[10px]">HISTORY</p>
              {state.questions.map((q) => (
                <div key={q.id} className="text-sm border-b border-white/10 pb-2">
                  <span className="text-magenta font-bold">{players[q.askerId]?.nickname}: </span>
                  <span className="text-white/80">{q.text}</span>
                  {q.answer && (
                    <span className={`ml-2 font-bold ${q.answer === 'yes' ? 'text-lime' : 'text-magenta'}`}>
                      → {q.answer === 'yes' ? 'YES ✅' : 'NO ❌'}
                    </span>
                  )}
                </div>
              ))}
              {state.questions.length === 0 && <p className="text-white/30 text-sm text-center py-2">No questions yet — ask away!</p>}
            </div>

            {/* Ask question */}
            {!state.buzzerId && (
              <div className="card p-4 space-y-3 border-cyan shadow-cyan bg-offblack">
                <input id="input-question" className="input-field"
                  placeholder="Ask a yes/no question..."
                  value={question} onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && question.trim() && (sendAction('ASK_QUESTION', { question: question.trim() }), setQuestion(''))} />
                <button onClick={() => { if (question.trim()) { sendAction('ASK_QUESTION', { question: question.trim() }); setQuestion(''); } }}
                  disabled={!question.trim()} className="btn-secondary w-full text-sm">
                  ASK QUESTION
                </button>
              </div>
            )}

            {/* Buzz to guess */}
            {!state.buzzerId ? (
              <button id="btn-buzz" onClick={() => sendAction('BUZZ')}
                className="btn-primary w-full py-4 text-xl animate-jitter !bg-spray !border-spray !text-black mt-2">
                🔔 BUZZ — I KNOW IT!
              </button>
            ) : isBuzzer ? (
              <div className="card p-4 space-y-4 border-spray shadow-spray animate-pop-in bg-offblack mt-4">
                <p className="text-spray text-center font-bebas text-2xl">YOU BUZZED IN!</p>
                <input id="input-guess" className="input-field text-center font-bebas text-xl"
                  placeholder="WHO IS IT?" value={guess} onChange={(e) => setGuess(e.target.value)} />
                <button id="btn-submit-guess" onClick={() => guess.trim() && sendAction('SUBMIT_GUESS', { guess: guess.trim() })}
                  disabled={!guess.trim()} className="btn-primary w-full">
                  SUBMIT GUESS
                </button>
              </div>
            ) : (
              <div className="card p-4 text-center border-spray shadow-spray bg-offblack mt-4">
                <p className="text-spray font-bebas text-2xl">
                  🔔 {players[state.buzzerId]?.nickname} BUZZED IN!
                </p>
                {state.buzzerGuess && <p className="text-white font-grotesk mt-2">Guessing: {state.buzzerGuess}</p>}
                <p className="font-marker text-white/40 text-sm mt-2 animate-pulse">Waiting for answer...</p>
              </div>
            )}

            {/* Skip vote */}
            {!mySkipVote && !state.buzzerId && (
              <button onClick={() => sendAction('VOTE_SKIP')}
                className="text-white/30 font-marker text-xs text-center w-full hover:text-white/60 transition-colors mt-2 block">
                Vote to skip (nobody knows this person) · {Object.keys(state.skipVotes).length} vote(s)
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'scoring') {
    return (
      <div className="player-screen p-4 sm:p-6 justify-center">
        <div className="w-full text-center space-y-8 animate-pop-in">
          <div>
            <p className="text-6xl mb-4 animate-float">🌟</p>
            <h2 className="font-marker text-xl text-white/60 mb-2">THE IDENTITY WAS...</h2>
            <p className="font-bebas text-5xl sm:text-6xl text-spray mb-4" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
              {state.revealedIdentity ?? '???'}
            </p>
            {state.buzzerId && (
              <p className={`text-2xl mt-4 font-bebas ${state.buzzerGuess ? 'text-lime' : 'text-magenta'}`}>
                {players[state.buzzerId]?.nickname}: "{state.buzzerGuess}"
              </p>
            )}
          </div>
          
          <div className="card p-4 sm:p-6 bg-offblack shadow-cyan border-cyan max-w-sm mx-auto">
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
