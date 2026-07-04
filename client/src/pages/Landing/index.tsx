import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { callCreateRoom, callJoinRoom } from '../../services/firebase';
import { useRoomStore, usePlayerIdentity, useUIStore } from '../../stores';

type View = 'home' | 'create' | 'join';

const GAME_CARDS = [
  { name: 'Double Dare', emoji: '🎯', desc: 'Bid & dare your friends' },
  { name: 'Slip It In', emoji: '🤫', desc: 'Sneak phrases into chat' },
  { name: 'Chameleon', emoji: '🦎', desc: 'Blend in, don\'t get caught' },
  { name: 'Mole', emoji: '🕵️', desc: 'Find the odd word out' },
  { name: 'Build a Bluff', emoji: '🎭', desc: 'Fake trivia answers (AI)' },
  { name: 'Reverse Guess Who', emoji: '🌟', desc: 'Find the identity (AI)' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('home');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { setIdentity } = usePlayerIdentity();
  const { setRoomCode: storeRoomCode } = useRoomStore();
  const { isLoading, error, setLoading, setError, setIsHost } = useUIStore();

  async function handleCreate() {
    if (!nickname.trim()) { setError('Enter your nickname'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await callCreateRoom({ nickname: nickname.trim() });
      setIdentity(data.playerId, data.playerToken, nickname.trim(), data.roomCode);
      storeRoomCode(data.roomCode);
      setIsHost(true);
      navigate(`/lobby/${data.roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!nickname.trim()) { setError('Enter your nickname'); return; }
    if (!roomCode.trim()) { setError('Enter room code'); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await callJoinRoom({
        roomCode: roomCode.toUpperCase().trim(),
        nickname: nickname.trim(),
      });
      setIdentity(data.playerId, data.playerToken, nickname.trim(), roomCode.toUpperCase().trim());
      storeRoomCode(roomCode.toUpperCase().trim());
      setIsHost(false);
      navigate(`/lobby/${roomCode.toUpperCase().trim()}`);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? '';
      if (msg.includes('not-found')) setError('Room not found. Check your code.');
      else if (msg.includes('full')) setError('Room is full (max 12 players).');
      else setError('Failed to join room');
    } finally { setLoading(false); }
  }

  return (
    <div className="host-screen p-6">
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Hero Section */}
        <div className="mb-12 text-center animate-slide-up">
          <h1 className="font-bebas text-7xl md:text-9xl text-spray tracking-wider mb-2" style={{ textShadow: '4px 4px 0 #FF2D78, 8px 8px 0 #00F5FF' }}>
            PARTYBOX
          </h1>
          <p className="font-marker text-white/60 text-lg md:text-xl transform -rotate-2">
            The underground party game platform
          </p>
        </div>

        {view === 'home' && (
          <div className="w-full animate-pop-in">
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <button
                id="btn-create-room"
                onClick={() => setView('create')}
                className="btn-primary btn-lg min-w-[240px]"
              >
                Create Room
              </button>
              <button
                id="btn-join-room"
                onClick={() => setView('join')}
                className="btn-secondary btn-lg min-w-[240px]"
              >
                Join Room
              </button>
            </div>

            {/* Game Flyers Grid */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px bg-white/20 flex-1 max-w-[100px]"></div>
              <span className="font-marker text-white/40 text-sm">6 GAMES INCLUDED</span>
              <div className="h-px bg-white/20 flex-1 max-w-[100px]"></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {GAME_CARDS.map((game, i) => (
                <div key={game.name} className="card-flyer p-5 flex flex-col items-center text-center">
                  <span className="text-4xl mb-3">{game.emoji}</span>
                  <h3 className="font-bebas text-2xl tracking-wide text-white mb-1">{game.name}</h3>
                  <p className="font-grotesk text-xs text-white/50">{game.desc}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="mt-16 flex flex-wrap gap-3 justify-center">
              <span className="tag-yellow">2–12 Players</span>
              <span className="tag-cyan">No Account Needed</span>
              <span className="tag-magenta">Phone as Controller</span>
              <span className="tag-lime">AI-Powered</span>
            </div>
          </div>
        )}

        {(view === 'create' || view === 'join') && (
          <div className="w-full max-w-md animate-pop-in mt-8">
            <div className="card p-8 shadow-magenta">
              <button
                onClick={() => { setView('home'); setError(null); }}
                className="font-marker text-white/40 hover:text-white/80 text-sm mb-6 transition-colors"
              >
                ← Back
              </button>

              <h2 className="font-bebas text-4xl mb-6 text-spray">
                {view === 'create' ? 'Create a Room' : 'Join a Room'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="section-label mb-2 block">Your Nickname</label>
                  <input
                    id="input-nickname"
                    className="input-field"
                    placeholder="e.g. Captain Chaos"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (view === 'create' ? handleCreate() : handleJoin())}
                    maxLength={20}
                    autoFocus
                  />
                </div>

                {view === 'join' && (
                  <div>
                    <label className="section-label mb-2 block">Room Code</label>
                    <input
                      id="input-room-code"
                      className="input-code"
                      placeholder="XXXX"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                      maxLength={4}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-magenta/20 border border-magenta p-3 text-magenta text-sm font-grotesk animate-jitter">
                    {error}
                  </div>
                )}

                <button
                  id={view === 'create' ? 'btn-confirm-create' : 'btn-confirm-join'}
                  onClick={view === 'create' ? handleCreate : handleJoin}
                  disabled={isLoading}
                  className="btn-primary btn-full mt-4"
                >
                  {isLoading ? 'LOADING...' : view === 'create' ? 'CREATE' : 'JOIN'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
