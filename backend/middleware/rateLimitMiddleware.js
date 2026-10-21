const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Completely skip rate limiting in development mode
  message: {
    success: false,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev, // Completely skip rate limiting in development mode
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});

module.exports = {
  loginRateLimiter,
  apiRateLimiter,
};
