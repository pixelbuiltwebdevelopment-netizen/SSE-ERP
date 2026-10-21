require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Module = require('../models/Module');
const { DEFAULT_MODULES } = require('../constants/modules');

const syncModules = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.MONGODB_DB_NAME || 'ERP_Dynamic_Auth'
    });
    console.log('MongoDB Connected.');

    await Module.deleteOne({ key: 'leads' });
    console.log('Removed deprecated Leads module from DB.');

    for (const modDef of DEFAULT_MODULES) {
      await Module.findOneAndUpdate(
        { key: modDef.key },
        { 
          name: modDef.name, 
          description: modDef.description,
          availableActions: modDef.availableActions,
          isActive: true
        },
        { upsert: true, new: true }
      );
      console.log('Synced module: ' + modDef.name);
    }

    console.log('Modules synchronization complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing modules:', error);
    process.exit(1);
  }
};

syncModules();
