import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

interface SocketJwtPayload {
  userId: string;
  email: string;
  role: string;
}

let io: Server;

export function initializeSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://127.0.0.1:5500',
      methods: ['GET', 'POST'],
    },
  });

  // Socket JWT middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token is required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as SocketJwtPayload;

      socket.data.user = decoded;

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketJwtPayload;

    const roomName = `user:${user.userId}`;

    socket.join(roomName);

    console.log(
      `🟢 Socket connected: ${socket.id} | User: ${user.email}`
    );

    console.log(
      `🏠 Joined room: ${roomName}`
    );

    socket.on('disconnect', () => {
      console.log(
        `🔴 Socket disconnected: ${socket.id}`
      );
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }

  return io;
}