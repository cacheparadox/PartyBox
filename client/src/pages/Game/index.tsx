import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRoomStore, usePlayerIdentity, useUIStore } from '../../stores';
import DoubleDareView from '../../games/DoubleDare';
import SlipItInView from '../../games/SlipItIn';
import ChameleonView from '../../games/Chameleon';
import MoleView from '../../games/Mole';
import BuildABluffView from '../../games/BuildABluff';
import ReverseGuessWhoView from '../../games/ReverseGuessWho';
import type { GameId } from '../../../../shared/src/index';

const GAME_VIEWS: Record<GameId, React.ComponentType> = {
  'double-dare': DoubleDareView,
  'slip-it-in': SlipItInView,
  chameleon: ChameleonView,
  mole: MoleView,
  'build-a-bluff': BuildABluffView,
  'reverse-guess-who': ReverseGuessWhoView,
};

export default function GamePage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { gameId, roomStatus, roomCode, gameState } = useRoomStore();
  const { playerId, nickname } = usePlayerIdentity();
  const isHost = useRoomStore((s) => s.players[playerId ?? '']?.isHost ?? false);

  useEffect(() => {
    if (urlRoomCode && urlRoomCode !== roomCode) {
      useRoomStore.getState().setRoomCode(urlRoomCode);
    }
  }, [urlRoomCode, roomCode]);

  useEffect(() => {
    // If not in a room, or identity doesn't match this room, force join
    if (roomStatus === null && !urlRoomCode) return;
    if (roomStatus === 'lobby') {
      navigate(`/lobby/${urlRoomCode}`);
    } else if (!playerId || usePlayerIdentity.getState().roomCode !== urlRoomCode) {
      // Identity lost or mismatch -> must join
      navigate(`/join/${urlRoomCode}`);
    }
  }, [roomStatus, urlRoomCode, playerId, navigate]);

  if (!gameId) {
    return (
      <div className="host-screen">
        <div className="text-white/50 font-display text-xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  const GameView = GAME_VIEWS[gameId];
  if (!GameView) {
    return (
      <div className="host-screen">
        <div className="text-rose-400 font-display">Unknown game: {gameId}</div>
      </div>
    );
  }

  return <GameView />;
}
