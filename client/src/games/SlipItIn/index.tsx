import { useState, useEffect } from 'react';
import { useRoomStore, usePlayerIdentity } from '../../stores';
import { callPlayerAction, callEndGame } from '../../services/firebase';
import type { SlipItInGameState, SlipItInPhrase, SlipItInClaim } from '../../../../shared/src/index';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Claim Timer ────────────────────────────────────────────────────────────
const CLAIM_DURATION_MS = 30_000;

function ClaimTimer({ claim, onTimeout }: { claim: SlipItInClaim; onTimeout: () => void }) {
  const [msLeft, setMsLeft] = useState(CLAIM_DURATION_MS);

  useEffect(() => {
    const tick = () => {
      if (claim.pausedAt !== null) return; // frozen while accused
      const elapsed = Date.now() - claim.startedAt;
      const remaining = Math.max(0, CLAIM_DURATION_MS - elapsed);
      setMsLeft(remaining);
      if (remaining === 0) onTimeout();
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [claim.startedAt, claim.pausedAt]);

  const secs = Math.ceil(msLeft / 1000);
  const pct = msLeft / CLAIM_DURATION_MS;
  const color = secs <= 5 ? '#FF2D78' : secs <= 10 ? '#FFD600' : '#00FFFF';

  return (
    <div className="space-y-3">
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct * 100}%`, backgroundColor: color, transition: 'width 0.25s linear, background-color 0.5s' }}
        />
      </div>
      <p className="font-bebas text-6xl" style={{ color }}>{secs}s</p>
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SlipItInView() {
  const { state, players, isHost, playerId, privateData, sendAction, roomCode } = useGame();
  const navigate = useNavigate();
  const hostId = useRoomStore((s) => s.hostId) ?? '';
  const [accuseTarget, setAccuseTarget] = useState<string | null>(null);

  if (!state) return null;

  // RTDB stores arrays as objects with numeric keys — normalize back to arrays
  function rtdbToArray<T>(val: unknown): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
    if (typeof val === 'object') return Object.values(val as Record<string, T>);
    return [];
  }

  const rawPhrases = (privateData as Record<string, unknown> | null)?.phrases;
  const myPhrases: SlipItInPhrase[] = rtdbToArray<SlipItInPhrase>(rawPhrases);
  const remainingPhrases = myPhrases.filter((p) => !p.completed);

  // ─── Instructions ──────────────────────────────────────────────────────
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
          {isHost && (
            <div className="space-y-3">
              <button id="btn-start-sii" onClick={() => sendAction('START_GAME')}
                className="btn-primary btn-lg btn-full">START GAME</button>
              <button onClick={() => sendAction('TOGGLE_HONOR_RULES')}
                className="btn-secondary w-full text-sm">
                {state.honorRules ? '🤝 Honor Rules ON (no group vote)' : '🗳️ Group Vote Mode ON'}
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
    const otherActiveClaims = Object.entries(state.activeClaims ?? {}).filter(([id]) => id !== playerId);

    // Active group votes I need to cast (not for myself)
    const myPendingVotes = Object.entries(state.activeVotes ?? {}).filter(
      ([targetId, v]) => targetId !== playerId && !(playerId && v.votes[playerId] !== undefined)
    );

    return (
      <div className="player-screen p-4 pt-6 md:pt-12 min-h-screen">
        <div className="relative z-10 w-full max-w-3xl mx-auto space-y-6 animate-pop-in">
          {isHost && <h2 className="phase-banner text-cyan text-center mb-6">SLIP IT IN</h2>}

          {/* ── My Phrases / Active Claim / Accusation ── */}
          <div className="card p-6 border-cyan shadow-cyan bg-offblack">
            {myClaim ? (
              <>
                {/* Accused — need to resolve */}
                {myClaim.pausedAt !== null && myClaim.accusedBy !== null ? (
                  <div className="text-center space-y-5">
                    <p className="font-bebas text-magenta text-4xl animate-jitter">🚨 YOU'VE BEEN ACCUSED!</p>
                    <p className="font-grotesk text-white/80 text-base">
                      <strong className="text-white">{players[myClaim.accusedBy]?.nickname}</strong> thinks you slipped in:
                    </p>
                    <div className="bg-cyan/10 border border-cyan/40 rounded-2xl p-5">
                      <p className="font-bebas text-cyan text-3xl">"{myClaim.phrase}"</p>
                    </div>
                    <p className="font-marker text-white/60 text-lg">Did they actually catch you?</p>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button onClick={() => sendAction('RESOLVE_ACCUSATION', { correct: true })}
                        className="btn-primary !bg-magenta !border-magenta !text-white py-5 text-2xl">
                        😬 YES, BUSTED
                      </button>
                      <button onClick={() => sendAction('RESOLVE_ACCUSATION', { correct: false })}
                        className="btn-primary !bg-lime !border-lime !text-black py-5 text-2xl">
                        🤫 NOPE! LIES!
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active claim — countdown running */
                  <div className="text-center space-y-5">
                    <p className="font-bebas text-lime text-3xl">PHRASE DROPPED! ✅</p>
                    <div className="bg-cyan/10 border border-cyan/30 rounded-2xl p-4">
                      <p className="font-bebas text-white text-2xl">"{myClaim.phrase}"</p>
                    </div>
                    <p className="font-marker text-white/50 text-sm">
                      If no one accuses you in time, it's yours!
                    </p>
                    <ClaimTimer
                      claim={myClaim}
                      onTimeout={() => sendAction('CLAIM_TIMEOUT', { claimPlayerId: playerId })}
                    />
                  </div>
                )}
              </>
            ) : activeVoteForMe ? (
              /* Group vote on MY phrase completion (honor rules off) */
              <div className="text-center space-y-4">
                <p className="font-bebas text-yellow text-3xl">🗳️ WAITING FOR VOTES...</p>
                <div className="bg-cyan/10 border border-cyan/30 rounded-2xl p-4">
                  <p className="font-bebas text-white text-2xl">"{activeVoteForMe.phrase}"</p>
                </div>
                <p className="font-marker text-white/50 text-sm">
                  {Object.keys(activeVoteForMe.votes).length} / {Object.keys(players).length - 1} voted
                </p>
              </div>
            ) : (
              /* Normal — show phrases */
              <>
                <p className="section-label mb-4 text-cyan">
                  YOUR SECRET PHRASES ({remainingPhrases.length} LEFT)
                </p>
                {remainingPhrases.length === 0 ? (
                  <p className="text-lime font-bebas text-3xl text-center">ALL DONE! 🎉</p>
                ) : (
                  <div className="space-y-3">
                    <p className="font-marker text-white/40 text-xs text-center mb-2">
                      Tap a phrase once you've slipped it into conversation ↓
                    </p>
                    {remainingPhrases.map((phrase) => (
                      <button
                        key={phrase.id}
                        onClick={() => sendAction('CLAIM_PHRASE', { phraseId: phrase.id, phrase: phrase.phrase })}
                        className="w-full text-left bg-cyan/10 border border-cyan/30 rounded-2xl p-4 hover:bg-cyan/20 active:scale-95 transition-all cursor-pointer group"
                      >
                        <p className="font-bebas text-white text-2xl tracking-wide group-hover:text-cyan transition-colors">
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

          {/* ── Vote on other players' claims ── */}
          {myPendingVotes.length > 0 && (
            <div className="card p-6 border-yellow shadow-spray-sm bg-offblack space-y-4">
              <p className="section-label text-yellow">🗳️ VOTE ON CLAIM</p>
              {myPendingVotes.map(([targetId, vote]) => (
                <div key={targetId} className="space-y-3">
                  <p className="font-grotesk text-white/80 text-base">
                    Did <strong className="text-white">{players[targetId]?.nickname}</strong> actually say:
                  </p>
                  <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-4">
                    <p className="font-bebas text-yellow text-2xl">"{vote.phrase}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => sendAction('VOTE_CLAIM', { targetPlayerId: targetId, vote: true })}
                      className="btn-primary !bg-lime !border-lime !text-black py-3 text-xl"
                    >
                      ✅ YES
                    </button>
                    <button
                      onClick={() => sendAction('VOTE_CLAIM', { targetPlayerId: targetId, vote: false })}
                      className="btn-primary !bg-magenta !border-magenta !text-white py-3 text-xl"
                    >
                      ❌ NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Who's claiming right now (for potential accusation) ── */}
          {otherActiveClaims.length > 0 && (
            <div className="card p-4 bg-offblack border-lime/30 space-y-2">
              <p className="section-label text-lime/70 text-xs">🔴 ACTIVE CLAIMS</p>
              {otherActiveClaims.map(([claimerId, claim]) => (
                <div key={claimerId} className="flex items-center justify-between gap-2 py-1">
                  <span className="font-bebas text-white text-xl">{players[claimerId]?.nickname}</span>
                  <span className="font-marker text-white/50 text-sm">
                    {claim.pausedAt !== null ? '⏸ paused' : '⏱ claiming...'}
                  </span>
                  {claim.pausedAt === null && (
                    <button
                      onClick={() => {
                        setAccuseTarget(claimerId);
                        // immediately send accusation for whoever is actively claiming
                        sendAction('ACCUSE_PLAYER', { accusedId: claimerId });
                        setAccuseTarget(null);
                      }}
                      className="text-xs font-bebas px-3 py-1 bg-magenta/20 border border-magenta rounded-lg text-magenta hover:bg-magenta hover:text-white transition-colors"
                    >
                      ACCUSE!
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Progress + Accusations ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-4 bg-offblack">
              <p className="section-label mb-3">EVERYONE'S PROGRESS</p>
              <div className="space-y-2">
                {Object.values(players).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1 font-bebas text-lg">
                    <span className="flex-1 truncate">{p.nickname}</span>
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

            <div className="card p-6 bg-offblack">
              <p className="section-label text-white/50 mb-4">RECENT ACCUSATIONS</p>
              <div className="space-y-3 font-grotesk text-sm">
                {(state.accusationLog || []).length === 0 && (
                  <p className="text-white/30 text-sm">No accusations yet...</p>
                )}
                {(state.accusationLog || []).slice(-5).reverse().map((log, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                    <span className={log.correct ? 'text-lime' : 'text-magenta'}>
                      {log.correct ? '✅' : '❌'}
                    </span>
                    <span className="text-white font-bold truncate max-w-[70px]">{players[log.accuserId]?.nickname}</span>
                    <span className="text-white/40">→</span>
                    <span className="text-white font-bold truncate max-w-[70px]">{players[log.accusedId]?.nickname}</span>
                    <span className="ml-auto text-white/30 text-xs">{log.correct ? 'caught' : 'false'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Accuse button (only when no active claim for you, and no one is claiming) ── */}
          {!myClaim && otherActiveClaims.length === 0 && (
            <>
              {accuseTarget === null ? (
                <button id="btn-accuse" onClick={() => setAccuseTarget('')}
                  className="btn-danger w-full py-4 text-xl mt-4">
                  🚨 ACCUSE SOMEONE!
                </button>
              ) : (
                <div className="card p-6 space-y-4 border-magenta shadow-magenta bg-offblack mt-4">
                  <p className="font-bebas text-magenta text-2xl">WHO DID YOU CATCH?</p>
                  <p className="font-marker text-white/50 text-sm">
                    ⚠️ False accusations earn you an extra phrase!
                  </p>
                  <select className="input-field font-bebas text-lg" value={accuseTarget}
                    onChange={(e) => setAccuseTarget(e.target.value)}>
                    <option value="">SELECT PLAYER...</option>
                    {Object.values(players).filter((p) => p.id !== playerId).map((p) => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>
                  {accuseTarget && (
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setAccuseTarget(null)}
                        className="btn-secondary flex-1">CANCEL</button>
                      <button id="btn-confirm-accuse"
                        className="btn-primary flex-1 !bg-magenta !border-magenta !text-white"
                        onClick={() => {
                          sendAction('ACCUSE_PLAYER', { accusedId: accuseTarget });
                          setAccuseTarget(null);
                        }}>
                        ACCUSE!
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
      <div className="host-screen">
        <div className="text-8xl text-center mb-6 animate-float">🏆</div>
        <h2 className="phase-banner text-cyan text-center mb-8" style={{ textShadow: '6px 6px 0 #FF2D78' }}>
          {winner?.nickname} WINS!
        </h2>
        <div className="card p-8 shadow-magenta border-magenta w-full max-w-md mx-auto mb-8 bg-offblack">
          {sorted.map((p, i) => (
            <div key={p.id} className="score-row py-3">
              <span className="text-3xl w-10 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
              <span className="flex-1 font-bebas text-2xl tracking-wide">{p.nickname}</span>
              <span className="font-bebas text-2xl text-cyan">{state.playerPhraseCount[p.id] ?? 0} left</span>
            </div>
          ))}
        </div>
        {isHost && (
          <button
            onClick={async () => {
              await callEndGame({ roomCode: roomCode!, requestingPlayerId: hostId });
              navigate(`/lobby/${roomCode}`);
            }}
            className="btn-primary btn-lg"
          >
            🔁 RETURN TO LOBBY
          </button>
        )}
      </div>
    );
  }

  return null;
}
