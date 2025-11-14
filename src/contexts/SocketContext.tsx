'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TournamentEvents } from '@/lib/socket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinTournament: (tournamentId: string) => void;
  leaveTournament: (tournamentId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinTournament: () => {},
  leaveTournament: () => {},
});

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

/**
 * Hook to listen to specific tournament events
 */
export function useTournamentEvent<K extends keyof TournamentEvents>(
  tournamentId: string | null,
  event: K,
  callback: (data: TournamentEvents[K]) => void
) {
  const { socket, joinTournament, leaveTournament } = useSocket();
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !tournamentId) return;

    // Join tournament room
    joinTournament(tournamentId);

    // Listen to event
    const handler = (data: TournamentEvents[K]) => {
      callbackRef.current(data);
    };

    socket.on(event as any, handler);

    return () => {
      socket.off(event as any, handler);
      leaveTournament(tournamentId);
    };
  }, [socket, tournamentId, event, joinTournament, leaveTournament]);
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Initialize Socket.IO client
    const socketInstance = io({
      path: '/api/socketio',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setIsConnected(true);

      // Rejoin all rooms after reconnection
      joinedRoomsRef.current.forEach((tournamentId) => {
        socketInstance.emit('join-tournament', tournamentId);
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketInstance.on('joined-tournament', ({ tournamentId, room }) => {
      console.log(`📺 Joined ${room}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinTournament = useCallback(
    (tournamentId: string) => {
      if (!socket) return;
      joinedRoomsRef.current.add(tournamentId);
      socket.emit('join-tournament', tournamentId);
    },
    [socket]
  );

  const leaveTournament = useCallback(
    (tournamentId: string) => {
      if (!socket) return;
      joinedRoomsRef.current.delete(tournamentId);
      socket.emit('leave-tournament', tournamentId);
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinTournament,
        leaveTournament,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
