import mongoose from 'mongoose';
import Whiteboard from '../models/Whiteboard.js';
import User from '../models/User.js';
import { verifyToken } from '../services/tokenService.js';
import { COLORS, ROLES } from '../utils/constants.js';

const boardUsers = {};

const getColor = (index) => {
  return COLORS[index % COLORS.length];
};

// Returns the user's role on the board, or null if they have no access
const getBoardRole = async (boardId, userId) => {
  if (!mongoose.isValidObjectId(boardId)) return null;
  const board = await Whiteboard.findById(boardId).select('owner sharedWith');
  if (!board) return null;
  if (board.owner.equals(userId)) return ROLES.OWNER;
  const share = board.sharedWith.find((s) => s.userId?.equals(userId));
  return share ? share.role : null;
};

const canEdit = (socket, boardId) => {
  const user = boardUsers[boardId]?.[socket.id];
  return Boolean(user) && user.role !== ROLES.VIEWER;
};

const handleLeave = (socket, boardId, io) => {
  if (!boardUsers[boardId]) return;
  delete boardUsers[boardId][socket.id];

  if (Object.keys(boardUsers[boardId]).length === 0) {
    delete boardUsers[boardId];
  } else {
    io.to(boardId).emit('presence-update', Object.values(boardUsers[boardId]));
  }

  socket.to(boardId).emit('cursor-leave', { socketId: socket.id });
  socket.leave(boardId);
};

const authenticate = (socket, next) => {
  const { token } = socket.handshake.auth || {};
  if (!token) return next(new Error('Not authorized, no token'));
  try {
    socket.data.userId = verifyToken(token).id;
    next();
  } catch {
    next(new Error('Token invalid or expired'));
  }
};

export const initSocket = (io) => {
  io.use(authenticate);

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-board', async ({ boardId }) => {
      try {
        const { userId } = socket.data;
        const [role, user] = await Promise.all([
          getBoardRole(boardId, userId),
          User.findById(userId).select('name'),
        ]);
        if (!role || !user) return;

        socket.join(boardId);

        if (!boardUsers[boardId]) boardUsers[boardId] = {};

        const userCount = Object.keys(boardUsers[boardId]).length;
        boardUsers[boardId][socket.id] = {
          userId,
          username: user.name,
          color: getColor(userCount),
          role,
        };

        io.to(boardId).emit('presence-update', Object.values(boardUsers[boardId]));
        console.log(`${user.name} joined board ${boardId}`);
      } catch (err) {
        console.error('join-board error:', err);
      }
    });

    socket.on('stroke-update', ({ boardId, stroke }) => {
      if (!canEdit(socket, boardId)) return;
      socket.to(boardId).emit('stroke-update', { stroke, socketId: socket.id });
    });

    // In-progress stroke points, streamed while the author is still drawing
    socket.on('stroke-progress', ({ boardId, stroke, from, points }) => {
      if (!canEdit(socket, boardId) || !stroke?.id || !Array.isArray(points)) return;
      socket.to(boardId).emit('stroke-progress', { stroke, from, points, socketId: socket.id });
    });

    socket.on('stroke-cancel', ({ boardId, id }) => {
      if (!canEdit(socket, boardId)) return;
      socket.to(boardId).emit('stroke-cancel', { id });
    });

    socket.on('stroke-erase', ({ boardId, ids }) => {
      if (!canEdit(socket, boardId) || !Array.isArray(ids)) return;
      socket.to(boardId).emit('stroke-erase', { ids, socketId: socket.id });
    });

    socket.on('board-sync', ({ boardId, strokes }) => {
      if (!canEdit(socket, boardId) || !Array.isArray(strokes)) return;
      socket.to(boardId).emit('board-sync', { strokes, socketId: socket.id });
    });

    socket.on('cursor-move', ({ boardId, x, y }) => {
      const user = boardUsers[boardId]?.[socket.id];
      if (!user) return;
      // volatile: drop stale cursor packets for slow clients instead of queueing them
      socket.volatile.to(boardId).emit('cursor-move', {
        socketId: socket.id,
        username: user.username,
        color: user.color,
        x,
        y,
      });
    });

    socket.on('leave-board', ({ boardId }) => {
      handleLeave(socket, boardId, io);
    });

    socket.on('disconnect', () => {
      for (const boardId in boardUsers) {
        if (boardUsers[boardId][socket.id]) {
          handleLeave(socket, boardId, io);
          break;
        }
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
};
