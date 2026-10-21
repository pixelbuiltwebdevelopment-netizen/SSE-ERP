const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/errorMiddleware');
const { apiRateLimiter } = require('./middleware/rateLimitMiddleware');

// Register Mongoose Models
require('./models/Role');
require('./models/Department');
require('./models/Branch');
require('./models/Team');
require('./models/User');
require('./models/Module');
require('./models/RefreshToken');
require('./models/AuditLog');
require('./models/Ticket');
require('./models/Company');
require('./models/LeaveRequest');
require('./models/CalendarEvent');
require('./models/Shift');
require('./models/AttendancePolicy');
require('./models/Attendance');
require('./models/AttendanceCorrection');
require('./models/OvertimeRequest');
require('./models/Notification');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const companyRoutes = require('./routes/companyRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security Middlewares
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
