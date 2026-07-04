import { useState, useEffect, useRef } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { SlipItInGameState, SlipItInPhrase, SlipItInClaim } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Claim Timer ────────────────────────────────────────────────────────────
const CLAIM_DURATION_MS = 30_000;

function ClaimTimer({ claim, onTimeout }: { claim: SlipItInClaim; onTimeout: () => void }) {
  const [msLeft, setMsLeft] = useState(CLAIM_DURATION_MS);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      if (claim.pausedAt != null) return;
      const elapsed = Date.now() - claim.startedAt;
      const remaining = Math.max(0, CLAIM_DURATION_MS - elapsed);
      setMsLeft(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onTimeout();
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [claim.startedAt, claim.pausedAt]);

  const secs = Math.ceil(msLeft / 1000);
  const pct = msLeft / CLAIM_DURATION_MS;
  const color = secs <= 5 ? '#FF2D78' : secs <= 10 ? '#FFD600' : '#00FFFF';

  return (
    <div className="space-y-2">
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color, transition: 'width 0.25s linear, background-color 0.5s' }}
        />
      </div>
      <p className="font-bebas text-5xl text-center" style={{ color }}>{secs}s</p>
    </div>
  );
}

// ─── Game Hook ──────────────────────────────────────────────────────────────
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

function rtdbToArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'object') return Object.values(val as Record<string, T>);
  return [];
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SlipItInView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [accuseTarget, setAccuseTarget] = useState<string | null>(null);

  if (!state) return null;

  const rawPhrases = (privateData as Record<string, unknown> | null)?.phrases;
  const myPhrases: SlipItInPhrase[] = rtdbToArray<SlipItInPhrase>(rawPhrases);
  const remainingPhrases = myPhrases.filter((p) => !p.completed);
  const phraseLog = rtdbToArray<{ playerId: string; phrase: string; timestamp: number }>(
    (state as any).phraseLog
  );

  // ─── Instructions ──────────────────────────────────────────────────────
  if (state.phase === 'instructions') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center animate-pop-in space-y-5">
          <div className="text-6xl animate-float">🤫</div>
          <h1 className="phase-banner text-cyan">SLIP IT IN</h1>
          <p className="font-grotesk text-white/60 text-base leading-relaxed">
            You each have <strong className="text-cyan">secret phrases</strong> to slip into conversation naturally.
            Catch others using their phrases to remove them. First to use all yours wins!
          </p>
          {isHost && (
            <div className="space-y-3">
              <button id="btn-start-sii" onClick={() => sendAction('START_GAME')}
                className="btn-primary btn-lg btn-full">START GAME</button>
              <button onClick={() => sendAction('TOGGLE_HONOR_RULES')}
                className="btn-secondary w-full text-sm py-3">
                {state.honorRules ? '🤝 Honor Rules ON (trust-based)' : '🗳️ Group Vote Mode ON'}
              </button>
            </div>
          )}
          {!isHost && <p className="font-marker text-white/40 text-sm animate-pulse">Waiting for host...</p>}
        </div>
      </div>
    );
  }

  // ─── Gameplay ──────────────────────────────────────────────────────────
  if (state.phase === 'gameplay') {
    const myClaim = state.activeClaims?.[playerId ?? ''];
    const activeVoteForMe = state.activeVotes?.[playerId ?? ''];
    const myPendingVotes = Object.entries(state.activeVotes ?? {}).filter(
      ([targetId, v]) => targetId !== playerId && !(playerId && v.votes[playerId] !== undefined)
    );

    return (
      <div className="min-h-screen bg-black flex flex-col p-4 gap-4">

        {/* ── My Section ── */}
        <div className="card p-5 border-cyan shadow-cyan bg-offblack">
          {myClaim ? (
            <>
              {myClaim.pausedAt != null && myClaim.accusedBy != null ? (
                <div className="text-center space-y-4">
                  <p className="font-bebas text-magenta text-3xl animate-jitter">🚨 YOU'VE BEEN ACCUSED!</p>
                  <p className="font-grotesk text-white/80 text-sm">
                    <strong className="text-white">{players[myClaim.accusedBy]?.nickname}</strong> thinks you slipped in:
                  </p>
                  <div className="bg-cyan/10 border border-cyan/40 rounded-2xl p-4">
                    <p className="font-bebas text-cyan text-2xl">"{myClaim.phrase}"</p>
                  </div>
                  <p className="font-marker text-white/60 text-base">Did they actually catch you?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => sendAction('RESOLVE_ACCUSATION', { correct: true })}
                      className="btn-primary !bg-magenta !border-magenta !text-white py-4 text-xl">
                      😬 YES, BUSTED
                    </button>
                    <button onClick={() => sendAction('RESOLVE_ACCUSATION', { correct: false })}
                      className="btn-primary !bg-lime !border-lime !text-black py-4 text-xl">
                      🤫 NOPE!
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="font-bebas text-lime text-2xl">PHRASE DROPPED! ✅</p>
                  <div className="bg-cyan/10 border border-cyan/30 rounded-2xl p-4">
                    <p className="font-bebas text-white text-xl">"{myClaim.phrase}"</p>
                  </div>
                  <p className="font-marker text-white/50 text-xs">If no one accuses you in time, it counts!</p>
                  <ClaimTimer
                    claim={myClaim}
                    onTimeout={() => sendAction('CLAIM_TIMEOUT', { claimPlayerId: playerId })}
                  />
                </div>
              )}
            </>
          ) : activeVoteForMe ? (
            <div className="text-center space-y-3">
              <p className="font-bebas text-yellow text-2xl">🗳️ WAITING FOR VOTES...</p>
              <div className="bg-cyan/10 border border-cyan/30 rounded-2xl p-4">
                <p className="font-bebas text-white text-xl">"{activeVoteForMe.phrase}"</p>
              </div>
              <p className="font-marker text-white/50 text-sm">
                {Object.keys(activeVoteForMe.votes).length} / {Object.keys(players).length - 1} voted
              </p>
            </div>
          ) : (
            <>
              <p className="section-label mb-3 text-cyan">YOUR PHRASES ({remainingPhrases.length} LEFT)</p>
              {remainingPhrases.length === 0 ? (
                <p className="text-lime font-bebas text-2xl text-center">ALL DONE! 🎉</p>
              ) : (
                <div className="space-y-2">
                  <p className="font-marker text-white/40 text-xs text-center mb-2">
                    Tap after slipping it into conversation ↓
                  </p>
                  {remainingPhrases.map((phrase) => (
                    <button
                      key={phrase.id}
                      onClick={() => sendAction('CLAIM_PHRASE', { phraseId: phrase.id, phrase: phrase.phrase })}
                      className="w-full text-left bg-cyan/10 border border-cyan/30 rounded-2xl p-4 hover:bg-cyan/20 active:scale-95 transition-all cursor-pointer group"
                    >
                      <p className="font-bebas text-white text-xl tracking-wide group-hover:text-cyan transition-colors">
                        "{phrase.phrase}"
                      </p>
                      <p className="font-grotesk text-white/30 text-xs mt-1">Tap to check off ✓</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Vote on others' claims ── */}
        {myPendingVotes.length > 0 && (
          <div className="card p-5 border-yellow shadow-spray-sm bg-offblack space-y-4">
            <p className="section-label text-yellow">🗳️ VOTE ON CLAIM</p>
            {myPendingVotes.map(([targetId, vote]) => (
              <div key={targetId} className="space-y-3">
                <p className="font-grotesk text-white/80 text-sm">
                  Did <strong className="text-white">{players[targetId]?.nickname}</strong> actually say:
                </p>
                <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-3">
                  <p className="font-bebas text-yellow text-xl">"{vote.phrase}"</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => sendAction('VOTE_CLAIM', { targetPlayerId: targetId, vote: true })}
                    className="btn-primary !bg-lime !border-lime !text-black py-3 text-lg">✅ YES</button>
                  <button onClick={() => sendAction('VOTE_CLAIM', { targetPlayerId: targetId, vote: false })}
                    className="btn-primary !bg-magenta !border-magenta !text-white py-3 text-lg">❌ NO</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Progress ── */}
        <div className="card p-4 bg-offblack">
          <p className="section-label mb-3">EVERYONE'S PROGRESS</p>
          <div className="space-y-2">
            {Object.values(players).map((p) => (
              <div key={p.id} className="flex items-center gap-3 font-bebas text-lg">
                <span className="flex-1 truncate text-sm">{p.nickname}</span>
                <div className="flex gap-1 flex-wrap justify-end max-w-[100px]">
                  {Array.from({ length: Math.min(state.playerPhraseCount[p.id] ?? 0, 10) }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-sm bg-cyan" />
                  ))}
                </div>
                <span className="text-cyan w-5 text-right text-base">{state.playerPhraseCount[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Phrase Feed ── */}
        {phraseLog.length > 0 && (
          <div className="card p-4 bg-offblack">
            <p className="section-label mb-3 text-lime">🎉 PHRASES SLIPPED IN</p>
            <div className="space-y-2">
              {[...phraseLog].reverse().slice(0, 8).map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border-b border-white/5 pb-2 last:border-0">
                  <span className="text-lime shrink-0">✓</span>
                  <div>
                    <span className="text-white font-bold">{players[entry.playerId]?.nickname}</span>
                    <span className="text-white/50"> slipped in </span>
                    <span className="text-cyan font-bebas text-base">"{entry.phrase}"</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Accuse button ── */}
        {!myClaim && (
          <>
            {accuseTarget === null ? (
              <button id="btn-accuse" onClick={() => setAccuseTarget('')}
                className="btn-danger w-full py-4 text-xl">
                🚨 ACCUSE SOMEONE!
              </button>
            ) : (
              <div className="card p-5 space-y-4 border-magenta shadow-magenta bg-offblack">
                <p className="font-bebas text-magenta text-xl">WHO DID YOU CATCH?</p>
                <p className="font-marker text-white/50 text-xs">⚠️ False accusations earn you an extra phrase!</p>
                <div className="space-y-2">
                  {Object.values(players).filter((p) => p.id !== playerId).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { sendAction('ACCUSE_PLAYER', { accusedId: p.id }); setAccuseTarget(null); }}
                      className="w-full card p-3 text-left font-bebas text-lg hover:border-magenta hover:text-magenta transition-colors"
                    >
                      {p.nickname}
                    </button>
                  ))}
                  <button onClick={() => setAccuseTarget(null)} className="btn-secondary w-full text-sm py-2 mt-2">CANCEL</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── Winner ───────────────────────────────────────────────────────────────
  if (state.phase === 'winner' || state.winnerId) {
    const winner = players[state.winnerId ?? ''];
    const sorted = Object.values(players).sort((a, b) =>
      (state.playerPhraseCount[a.id] ?? 0) - (state.playerPhraseCount[b.id] ?? 0)
    );
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-7xl animate-float">🏆</div>
        <h2 className="phase-banner text-cyan text-center" style={{ textShadow: '4px 4px 0 #FF2D78' }}>
          {winner?.nickname} WINS!
        </h2>
        <div className="card p-6 shadow-magenta border-magenta w-full max-w-sm bg-offblack">
          {sorted.map((p, i) => (
            <div key={p.id} className="score-row py-2">
              <span className="text-2xl w-8 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <span className="flex-1 font-bebas text-xl">{p.nickname}</span>
              <span className="font-bebas text-xl text-cyan">{state.playerPhraseCount[p.id] ?? 0} left</span>
            </div>
          ))}
        </div>
        {phraseLog.length > 0 && (
          <div className="card p-4 w-full max-w-sm bg-offblack">
            <p className="section-label mb-2 text-lime text-xs">PHRASES SLIPPED IN THIS GAME</p>
            {[...phraseLog].reverse().map((entry, i) => (
              <div key={i} className="text-sm py-1 border-b border-white/5 last:border-0">
                <span className="text-white font-bold">{players[entry.playerId]?.nickname}:</span>
                <span className="text-cyan ml-2">"{entry.phrase}"</span>
              </div>
            ))}
          </div>
        )}
        {isHost && (
          <button
            onClick={async () => { await callEndGame({ roomCode: roomCode!, requestingPlayerId: hostId }); navigate(`/lobby/${roomCode}`); }}
            className="btn-primary btn-lg"
          >🔁 RETURN TO LOBBY</button>
        )}
      </div>
    );
  }

  return null;
}
