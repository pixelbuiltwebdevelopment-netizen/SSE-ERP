require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ExpenseClaim = require('./models/ExpenseClaim');
const User = require('./models/User');
const { buildDataScopeFilter } = require('./services/dataScopeService');

async function test() {
  await connectDB();
  const superAdmin = await User.findOne({ email: 'admin@erp.com' }).populate('roleId');
  console.log('Super Admin found:', superAdmin.email);
  
  const scope = 'ALL';
  const filter = buildDataScopeFilter({ user: superAdmin, moduleKey: 'expenses', actionKey: 'view', scope });
  console.log('Filter:', filter);
  
  const claims = await ExpenseClaim.find(filter);
  console.log('Claims count:', claims.length);
  
  process.exit(0);
}
test();
