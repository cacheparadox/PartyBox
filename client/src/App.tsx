import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './pages/Landing';
import LobbyPage from './pages/Lobby';
import GamePage from './pages/Game';
import AdminPage from './pages/Admin';
import { useRoomStore, usePlayerIdentity } from './stores';
import { useRoomSubscription, usePrivateDataSubscription } from './hooks/useRTDB';

function AppSubscriptions() {
  const roomCode = useRoomStore((s) => s.roomCode);
  const playerId = usePlayerIdentity((s) => s.playerId);
  useRoomSubscription(roomCode);
  usePrivateDataSubscription(roomCode, playerId);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppSubscriptions />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/lobby/:roomCode" element={<LobbyPage />} />
          <Route path="/game/:roomCode" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
