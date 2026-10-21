require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

require('./models/Role');
require('./models/User');

const User = mongoose.model('User');
const tokenService = require('./services/tokenService');

async function test() {
  await connectDB();
  const superAdmin = await User.findOne({ email: 'admin@erp.com' });
  const token = tokenService.generateAccessToken(superAdmin._id);
  console.log('Token:', token);
  process.exit(0);
}
test();
