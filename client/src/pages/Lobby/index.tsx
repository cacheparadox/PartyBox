import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  const { roomCode, hostId, gameId, players } = useRoomStore();
  const { playerId } = usePlayerIdentity();
  const { setError, setLoading } = useUIStore();
  
  const isHost = playerId === hostId;
  const [selectedGame, setSelectedGame] = useState<GameId>(gameId || 'chameleon');
  const [showAI, setShowAI] = useState(false);
  const [aiKey, setAiKey] = useState(localStorage.getItem('partybox_ai_key') || '');
  const [aiModel, setAiModel] = useState(localStorage.getItem('partybox_ai_model') || 'anthropic/claude-3-haiku');

  const joinUrl = useMemo(() => {
    return `${window.location.origin}/join/${roomCode}`;
  }, [roomCode]);

  const activePlayers = Object.entries(players).filter(([_, p]) => p.isConnected);
  const me = players[playerId || ''];

  async function handleToggleReady() {
    if (!playerId || !me || !roomCode) return;
    try {
      await callSetReady({ roomCode, isReady: !me.isReady, playerId });
    } catch (e: unknown) {
      console.error('Ready toggle failed:', e);
    }
  }

  async function handleStart() {
    if (!roomCode || !playerId) return;
    setLoading(true);
    try {
      // Pass an empty array for selectedPacks for now since content packs are managed elsewhere or default to all
      await callStartGame({ roomCode, gameId: selectedGame, selectedPacks: [], requestingPlayerId: playerId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAISettings() {
    if (!roomCode || !playerId) return;
    setLoading(true);
    try {
      localStorage.setItem('partybox_ai_key', aiKey);
      localStorage.setItem('partybox_ai_model', aiModel);
      await callUpdateAISettings({ 
        roomCode, 
        settings: {
          apiKey: aiKey,
          model: aiModel,
          temperature: 0.8,
          maxTokens: 500
        },
        requestingPlayerId: playerId
      });
      setShowAI(false);
    } catch (e) {
      setError('Failed to update AI settings');
    } finally {
      setLoading(false);
    }
  }

  const error = useUIStore(s => s.error);

  if (!roomCode) return <div className="host-screen"><div className="font-bebas text-4xl text-spray animate-pulse">LOADING ROOM...</div></div>;

  const errorDisplay = error && (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-magenta text-white px-4 py-2 rounded shadow-magenta font-bebas z-50 animate-pop-in">
      {error}
    </div>
  );

  // ─── HOST VIEW ───
  if (isHost) {
    return (
      <div className="host-screen p-8">
        {errorDisplay}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-8 items-start h-full">
          
          {/* Left Col: Players */}
          <div className="col-span-3 card p-6 shadow-spray-sm min-h-[500px]">
            <h2 className="section-label mb-4">PLAYERS ({activePlayers.length})</h2>
            <div className="flex flex-col gap-3">
              {activePlayers.map(([pid, p]) => (
                <div key={pid} className={`player-chip ${p.isReady ? 'player-chip-ready' : ''} group relative`}>
                  <div className="flex-1 truncate">{p.nickname}</div>
                  {p.isReady ? <span className="text-lime text-xs font-marker">READY</span> : <span className="text-white/30 text-xs font-marker">WAIT</span>}
                  
                  {p.isHost ? (
                     <span className="ml-2 text-[10px] bg-spray text-black px-1 rounded font-bebas">HOST</span>
                  ) : (
                    <button 
                      onClick={() => callKickPlayer({ roomCode, targetPlayerId: pid, requestingPlayerId: playerId! })}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 text-magenta hover:text-white transition-opacity font-bebas text-sm bg-black/50 px-2 py-1 rounded"
                    >
                      KICK
                    </button>
                  )}
                </div>
              ))}
              {activePlayers.length === 0 && (
                <div className="text-center p-8 border border-dashed border-white/10 text-white/30 font-grotesk text-sm">
                  Waiting for players...
                </div>
              )}
            </div>
          </div>

          {/* Middle Col: Room Code & Game config */}
          <div className="col-span-6 flex flex-col items-center justify-between min-h-[500px]">
            <div className="text-center w-full animate-pop-in mt-4">
              <div className="font-marker text-spray text-xl mb-2 transform -rotate-2">JOIN AT</div>
              <div className="code-display leading-none mb-6 text-[10rem]">{roomCode}</div>
              
              {/* Game Selector (Sticker row) */}
              <div className="w-full mt-12 text-left">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="section-label">SELECT GAME</h3>
                  <button onClick={() => setShowAI(!showAI)} className={`tag ${aiKey ? 'tag-cyan' : 'tag-chalk'}`}>
                    🤖 AI SETTINGS
                  </button>
                </div>
                
                {showAI ? (
                  <div className="card p-6 bg-offblack shadow-cyan border-cyan mb-8 animate-slide-up">
                    <h3 className="font-bebas text-2xl text-cyan mb-4">AI CONFIG</h3>
                    <input type="password" placeholder="OpenRouter API Key (sk-or-v1-...)" className="input-field mb-3" value={aiKey} onChange={e => setAiKey(e.target.value)} />
                    <input type="text" placeholder="Model ID (e.g. anthropic/claude-3-haiku)" className="input-field mb-4" value={aiModel} onChange={e => setAiModel(e.target.value)} />
                    <div className="flex gap-3">
                      <button onClick={handleSaveAISettings} className="btn-primary flex-1">SAVE</button>
                      <button onClick={() => setShowAI(false)} className="btn-secondary flex-1">CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                    {GAMES.map(g => (
                      <div 
                        key={g.id}
                        onClick={() => setSelectedGame(g.id as GameId)}
                        className={`card flex-none w-48 p-4 cursor-pointer snap-start transition-all
                          ${selectedGame === g.id ? 'border-spray shadow-spray -translate-y-2' : 'hover:-translate-y-1 hover:border-white/30'}`}
                      >
                        <div className="text-4xl mb-2">{g.emoji}</div>
                        <div className="font-bebas text-xl mb-1 truncate">{g.name}</div>
                        <div className="text-xs text-white/50 mb-3">{g.desc}</div>
                        <div className="flex gap-2">
                          <span className="tag-chalk">{g.players}</span>
                          {g.ai && <span className="tag-cyan">AI</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full mt-8">
              <button 
                onClick={handleStart} 
                disabled={activePlayers.length < (GAMES.find(g => g.id === selectedGame)?.minPlayers || 2)} 
                className="btn-primary btn-lg btn-full text-2xl hover:animate-jitter"
              >
                START {GAMES.find(g => g.id === selectedGame)?.name.toUpperCase() || 'GAME'}
              </button>
            </div>
          </div>

          {/* Right Col: QR Code */}
          <div className="col-span-3 flex flex-col items-center justify-center">
            <div className="card p-6 bg-white transform rotate-2 shadow-magenta">
              <QRCodeSVG value={joinUrl} size={220} bgColor="#ffffff" fgColor="#111111" level="H" />
            </div>
            <div className="mt-4 font-marker text-white/50 text-sm transform rotate-2">SCAN TO JOIN</div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYER VIEW ───
  return (
    <div className="player-screen p-6 justify-center">
      <div className="text-center mb-12">
        <div className="section-label mb-2">ROOM</div>
        <div className="code-display text-6xl">{roomCode}</div>
      </div>
      
      <div className="card p-8 mb-8 text-center shadow-spray">
        <div className="text-sm text-white/50 font-grotesk mb-1">YOU ARE</div>
        <div className="font-bebas text-4xl text-white mb-8 truncate">{me?.nickname}</div>
        
        <button 
          onClick={handleToggleReady}
          className={`btn-primary w-full py-4 text-2xl ${me?.isReady ? '!bg-lime !border-lime !text-black' : ''}`}
          style={me?.isReady ? { boxShadow: '4px 4px 0 #A8FF3E' } : {}}
        >
          {me?.isReady ? "I'M READY!" : 'NOT READY'}
        </button>
      </div>
      
      <div className="text-center">
        <div className="font-marker text-white/40 mb-3">WAITING ON HOST</div>
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-spray animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
