"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = initializeSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io;
function initializeSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://127.0.0.1:5500',
            methods: ['GET', 'POST'],
        },
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Token is required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.data.user = decoded;
            next();
        }
        catch (error) {
            next(new Error('Invalid or expired token'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        const roomName = `user:${user.userId}`;
        socket.join(roomName);
        console.log(`🟢 Socket connected: ${socket.id} | User: ${user.email}`);
        console.log(`🏠 Joined room: ${roomName}`);
        socket.on('disconnect', () => {
            console.log(`🔴 Socket disconnected: ${socket.id}`);
        });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }
    return io;
}
