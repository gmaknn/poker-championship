import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export async function GET(req: NextRequest) {
  if (!io) {
    // @ts-ignore - Access to the underlying server
    const httpServer: HTTPServer = (req as any).socket?.server;

    if (!httpServer) {
      return new Response('WebSocket server not available', { status: 500 });
    }

    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join tournament room
      socket.on('join-tournament', (tournamentId: string) => {
        socket.join(`tournament:${tournamentId}`);
        console.log(`Client ${socket.id} joined tournament ${tournamentId}`);
      });

      // Leave tournament room
      socket.on('leave-tournament', (tournamentId: string) => {
        socket.leave(`tournament:${tournamentId}`);
        console.log(`Client ${socket.id} left tournament ${tournamentId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.IO server initialized');
  }

  return new Response('Socket.IO server is running', { status: 200 });
}

// Export the io instance for use in other API routes
export function getIO(): SocketIOServer | null {
  return io;
}
