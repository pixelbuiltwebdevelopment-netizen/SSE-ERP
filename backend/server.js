require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initCronJobs } = require('./services/cronService');
const { initSocket } = require('./services/socketService');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas and start server
connectDB().then(() => {
  // Initialize cron jobs
  initCronJobs();

  // Create HTTP server from Express app
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[ERP Authorization Server Running]: Port=${PORT}, Env=${process.env.NODE_ENV || 'development'}`);
  });
});
