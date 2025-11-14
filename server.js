const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3003;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Store io instance globally for access in API routes
  global.io = io;

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join tournament room
    socket.on('join-tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`;
      socket.join(room);
      console.log(`📺 Client ${socket.id} joined ${room}`);

      // Notify the client that they successfully joined
      socket.emit('joined-tournament', { tournamentId, room });
    });

    // Leave tournament room
    socket.on('leave-tournament', (tournamentId) => {
      const room = `tournament:${tournamentId}`;
      socket.leave(room);
      console.log(`👋 Client ${socket.id} left ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO ready on path /api/socketio`);
    });
});
