import { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { callSetReady, callStartGame, callKickPlayer, callUpdateAISettings } from '../../services/firebase';
import { useRoomStore, usePlayerIdentity, useUIStore } from '../../stores';
import type { GameId } from '../../../../shared/src/index';

const GAMES = [
  { id: 'double-dare', name: 'Double Dare', emoji: '🎯', desc: 'Bid items', players: '2-12', minPlayers: 2, ai: false },
  { id: 'slip-it-in', name: 'Slip It In', emoji: '🤫', desc: 'Secret phrases', players: '2-12', minPlayers: 2, ai: false },
  { id: 'chameleon', name: 'Chameleon', emoji: '🦎', desc: 'Blend in', players: '3-10', minPlayers: 3, ai: false },
  { id: 'mole', name: 'Mole', emoji: '🕵️', desc: 'Find the mole', players: '3-10', minPlayers: 3, ai: false },
  { id: 'build-a-bluff', name: 'Build a Bluff', emoji: '🎭', desc: 'Fake trivia', players: '2-12', minPlayers: 2, ai: true },
  { id: 'reverse-guess-who', name: 'Reverse Guess Who', emoji: '🌟', desc: 'Find identity', players: '2-12', minPlayers: 2, ai: true },
];

export default function Lobby() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const { roomCode, roomStatus, hostId, gameId, players, setRoomCode } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const { setError, setLoading } = useUIStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (urlRoomCode && urlRoomCode !== roomCode) setRoomCode(urlRoomCode);
  }, [urlRoomCode, roomCode, setRoomCode]);
  
  useEffect(() => {
    if (roomStatus === 'playing' && roomCode) navigate(`/game/${roomCode}`);
  }, [roomStatus, roomCode, navigate]);
  
  const isHost = playerId === hostId;
  const [selectedGame, setSelectedGame] = useState<GameId>(gameId || 'chameleon');
  const [showAI, setShowAI] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [aiKey, setAiKey] = useState(localStorage.getItem('partybox_ai_key') || '');
  const [aiModel, setAiModel] = useState(localStorage.getItem('partybox_ai_model') || 'anthropic/claude-3-haiku');

  const joinUrl = useMemo(() => `${window.location.origin}/join/${roomCode}`, [roomCode]);
  const activePlayers = Object.entries(players).filter(([_, p]) => p.isConnected);
  const me = players[playerId || ''];
  const error = useUIStore(s => s.error);

  async function handleToggleReady() {
    if (!playerId || !me || !roomCode) return;
    try { await callSetReady({ roomCode, isReady: !me.isReady, playerId }); }
    catch (e) { console.error('Ready toggle failed:', e); }
  }

  async function handleStart() {
    if (!roomCode || !playerId) return;
    setLoading(true);
    try { await callStartGame({ roomCode, gameId: selectedGame, selectedPacks: [], requestingPlayerId: playerId }); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to start'); }
    finally { setLoading(false); }
  }

  async function handleSaveAISettings() {
    if (!roomCode || !playerId) return;
    setLoading(true);
    try {
      localStorage.setItem('partybox_ai_key', aiKey);
      localStorage.setItem('partybox_ai_model', aiModel);
      await callUpdateAISettings({ roomCode, settings: { apiKey: aiKey, model: aiModel, temperature: 0.8, maxTokens: 500 }, requestingPlayerId: playerId });
      setShowAI(false);
    } catch (e) { setError('Failed to update AI settings'); }
    finally { setLoading(false); }
  }

  if (!roomCode) return <div className="player-screen p-6 justify-center"><div className="font-bebas text-4xl text-spray animate-pulse text-center">LOADING ROOM...</div></div>;

  const errorDisplay = error && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-magenta text-white px-4 py-2 rounded shadow-magenta font-bebas z-50 animate-pop-in text-sm whitespace-nowrap">
      {error}
    </div>
  );

  const minP = GAMES.find(g => g.id === selectedGame)?.minPlayers || 2;
  const canStart = activePlayers.length >= minP;

  return (
    <div className="player-screen p-4 sm:p-6 gap-6">
      {errorDisplay}

      {/* ── Header: Room code + QR ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-marker text-spray text-sm mb-1 -rotate-1">ROOM CODE</div>
          <div className="code-display text-5xl leading-none">{roomCode}</div>
        </div>
        <button
          onClick={() => setShowQR(v => !v)}
          className="card p-3 border-spray text-spray font-bebas text-sm flex flex-col items-center gap-1 shrink-0 bg-offblack"
        >
          <span className="text-2xl">📱</span>
          <span>QR</span>
        </button>
      </div>

      {/* QR Code modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-8" onClick={() => setShowQR(false)}>
          <div className="card p-6 bg-white" onClick={e => e.stopPropagation()}>
            <QRCodeSVG value={joinUrl} size={220} bgColor="#ffffff" fgColor="#111111" level="H" />
            <p className="text-black font-marker text-center mt-3 text-sm">Scan to join</p>
          </div>
        </div>
      )}

      {/* ── My Identity & Ready Status ── */}
      <div className="card p-5 w-full text-center shadow-spray border-spray bg-offblack">
        <div className="text-xs text-white/50 font-grotesk mb-1">YOU ARE</div>
        <div className="font-bebas text-3xl text-white mb-4 truncate">{me?.nickname}</div>
        {!isHost && (
          <button
            onClick={handleToggleReady}
            className={`btn-primary w-full py-4 text-xl ${me?.isReady ? '!bg-lime !border-lime !text-black' : ''}`}
            style={me?.isReady ? { boxShadow: '4px 4px 0 #A8FF3E' } : {}}
          >
            {me?.isReady ? "✅ I'M READY!" : 'TAP WHEN READY'}
          </button>
        )}
        {isHost && (
          <p className="font-marker text-lime text-sm">👑 YOU ARE THE HOST</p>
        )}
      </div>

      {/* ── Players list ── */}
      <div className="card p-4 bg-offblack">
        <h2 className="section-label mb-3">PLAYERS ({activePlayers.length})</h2>
        <div className="flex flex-wrap gap-2">
          {activePlayers.map(([pid, p]) => (
            <div key={pid} className={`player-chip ${p.isReady ? 'player-chip-ready' : ''} relative group`}>
              <span className="truncate max-w-[100px] text-sm">{p.nickname}</span>
              {p.isHost
                ? <span className="ml-1 text-[9px] bg-spray text-black px-1 rounded font-bebas">HOST</span>
                : <span className={`ml-1 text-[9px] font-marker ${p.isReady ? 'text-lime' : 'text-white/30'}`}>{p.isReady ? '✓' : '…'}</span>
              }
              {isHost && !p.isHost && (
                <button
                  onClick={() => callKickPlayer({ roomCode, targetPlayerId: pid, requestingPlayerId: playerId! })}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-magenta rounded-full text-white text-[9px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center"
                >×</button>
              )}
            </div>
          ))}
          {activePlayers.length === 0 && (
            <p className="text-white/30 font-grotesk text-sm py-2">Waiting for players to join...</p>
          )}
        </div>
      </div>

      {/* ── Game Controls (Host Only) or Waiting Status ── */}
      {isHost ? (
        <div className="card p-4 bg-offblack flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="section-label">SELECT GAME</h3>
            <button onClick={() => setShowAI(!showAI)} className={`tag text-xs ${aiKey ? 'tag-cyan' : 'tag-chalk'}`}>
              🤖 AI
            </button>
          </div>

          {showAI ? (
            <div className="space-y-3 mb-6">
              <input type="password" placeholder="OpenRouter API Key (sk-or-v1-...)" className="input-field text-sm" value={aiKey} onChange={e => setAiKey(e.target.value)} />
              <input type="text" placeholder="Model ID (e.g. anthropic/claude-3-haiku)" className="input-field text-sm" value={aiModel} onChange={e => setAiModel(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={handleSaveAISettings} className="btn-primary flex-1 text-sm py-2">SAVE</button>
                <button onClick={() => setShowAI(false)} className="btn-secondary flex-1 text-sm py-2">CANCEL</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {GAMES.map(g => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGame(g.id as GameId)}
                  className={`card p-2 cursor-pointer transition-all text-center flex flex-col justify-center min-h-[80px]
                    ${selectedGame === g.id ? 'border-spray shadow-spray -translate-y-0.5' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="text-2xl mb-1 leading-none">{g.emoji}</div>
                  <div className="font-bebas text-sm leading-tight mb-1">{g.name}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary btn-lg w-full mt-auto"
          >
            {canStart
              ? `START ${GAMES.find(g => g.id === selectedGame)?.name.toUpperCase() || 'GAME'}`
              : `NEED ${minP - activePlayers.length} MORE PLAYER${minP - activePlayers.length !== 1 ? 'S' : ''}`
            }
          </button>
        </div>
      ) : (
        <div className="text-center mt-auto pb-4">
          <div className="font-marker text-white/40 mb-3 text-sm">WAITING FOR HOST TO START</div>
          <div className="flex justify-center gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-spray animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
