const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3003;

// Determine allowed CORS origins
function getAllowedOrigins() {
  // In development, allow localhost
  if (dev) {
    return [
      'http://localhost:3003',
      'http://localhost:3000',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:3000',
    ];
  }

  // In production, use configured origins
  const origins = [];

  // Add NEXTAUTH_URL if configured
  if (process.env.NEXTAUTH_URL) {
    origins.push(process.env.NEXTAUTH_URL);
  }

  // Add NEXT_PUBLIC_APP_URL if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Add Fly.io default domain pattern
  // Example: https://wpt-villelaure.fly.dev
  if (process.env.FLY_APP_NAME) {
    origins.push(`https://${process.env.FLY_APP_NAME}.fly.dev`);
  }

  // Fallback: if no origins configured, log warning and use restrictive default
  if (origins.length === 0) {
    console.warn('[SECURITY] No CORS origins configured. Socket.IO will reject cross-origin requests.');
    console.warn('[SECURITY] Set NEXTAUTH_URL or NEXT_PUBLIC_APP_URL environment variable.');
    return false; // Socket.IO will reject all cross-origin requests
  }

  return origins;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[ERROR] Request handling failed:', req.url, err.message);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const allowedOrigins = getAllowedOrigins();
  console.log('[CORS] Allowed origins:', allowedOrigins);

  const io = new Server(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store io instance globally for access in API routes
  global.io = io;

  io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);

    // Join tournament room
    socket.on('join-tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`;
      socket.join(room);
      console.log(`[SOCKET] Client ${socket.id} joined ${room}`);

      // Notify the client that they successfully joined
      socket.emit('joined-tournament', { tournamentId, room });
    });

    // Leave tournament room
    socket.on('leave-tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`;
      socket.leave(room);
      console.log(`[SOCKET] Client ${socket.id} left ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Client disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error('[FATAL] Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`[SERVER] Ready on http://${hostname}:${port}`);
      console.log(`[SERVER] Socket.IO ready on path /api/socketio`);
      console.log(`[SERVER] Environment: ${dev ? 'development' : 'production'}`);
    });
});
