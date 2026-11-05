const cron = require('node-cron');
const { processAutoPunchOut } = require('./automaticPunchOutService');

/**
 * Initializes all cron jobs for the application.
 */
const initCronJobs = () => {
  console.log('[Cron] Initializing scheduled jobs...');

  // Auto-Punch Out Job runs every 5 minutes to record auto checkout at the configured time
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processAutoPunchOut();
      if (result.processed > 0) {
        console.log(`[Cron Auto-Punch] ${result.message}`);
      }
    } catch (error) {
      console.error('[Cron Auto-Punch Error]:', error);
    }
  });

  console.log('[Cron] Initialized Auto-Punch Out cron job (every 5 minutes).');
};

module.exports = { initCronJobs };
