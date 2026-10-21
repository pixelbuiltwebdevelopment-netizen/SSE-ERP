const cron = require('node-cron');
const { processAutoPunchOut } = require('./automaticPunchOutService');

/**
 * Initializes all cron jobs for the application.
 */
const initCronJobs = () => {
  console.log('[Cron] Initializing scheduled jobs...');

  // Auto-Punch Out Job runs every 15 minutes to catch expired shifts or max-hours limit
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await processAutoPunchOut();
      if (result.processed > 0) {
        console.log(`[Cron Auto-Punch] ${result.message}`);
      }
    } catch (error) {
      console.error('[Cron Auto-Punch Error]:', error);
    }
  });

  console.log('[Cron] Initialized Auto-Punch Out cron job (every 15 minutes).');
};

module.exports = { initCronJobs };
