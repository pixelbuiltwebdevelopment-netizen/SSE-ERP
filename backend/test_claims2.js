require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Register models
require('./models/Role');
require('./models/Department');
require('./models/Branch');
require('./models/Team');
require('./models/User');
require('./models/ExpenseClaim');

const ExpenseClaim = mongoose.model('ExpenseClaim');
const User = mongoose.model('User');
const { buildDataScopeFilter } = require('./services/dataScopeService');

async function test() {
  await connectDB();
  const superAdmin = await User.findOne({ email: 'admin@erp.com' }).populate('roleId');
  
  const filter = buildDataScopeFilter({ user: superAdmin, moduleKey: 'expenses', actionKey: 'view', scope: 'ALL' });
  console.log('Filter:', filter);
  
  const claims = await ExpenseClaim.find(filter)
      .populate('userId', 'name email employeeId')
      .populate('approvedBy', 'name');
      
  console.log('Claims returned:', claims.length);
  process.exit(0);
}
test();
