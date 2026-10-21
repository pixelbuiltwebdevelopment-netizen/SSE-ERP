const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Depending on needs, we might fetch user details

let io;

const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded; 

      // Fetch full user for detailed scoping (e.g., branch, department)
      const user = await User.findById(decoded.userId).select('branchId departmentId roleId');
      if (user) {
        socket.user.id = user._id.toString();
        socket.user.branch = user.branchId?.toString();
        socket.user.department = user.departmentId?.toString();
        socket.user.role = user.roleId?.toString();
      } else {
        return next(new Error('Authentication error: User not found'));
      }

      next();
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.id}`);

    // Join Global Room
    socket.join('global');

    // Join User-specific Room
    if (socket.user.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // Join Role-specific Room
    if (socket.user.role) {
      socket.join(`role_${socket.user.role}`);
    }

    // Join Branch-specific Room
    if (socket.user.branch) {
      socket.join(`branch_${socket.user.branch}`);
    }

    // Join Department-specific Room
    if (socket.user.department) {
      socket.join(`department_${socket.user.department}`);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
