const cron = require('node-cron');
const notificationJobs = require('./notificationJobs');

const startScheduledJobs = () => {
  // Daily at 9:00 AM - Send overdue reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled job: Overdue Reminders');
    await notificationJobs.sendOverdueReminders();
  });

  // Every Monday at 8:00 AM - Send weekly digests
  cron.schedule('0 8 * * 1', async () => {
    console.log('Running scheduled job: Weekly Digests');
    await notificationJobs.sendWeeklyDigests();
  });

  // Daily at 10:00 AM - Check overdue onboardings
  cron.schedule('0 10 * * *', async () => {
    console.log('Running scheduled job: Overdue Onboardings');
    await notificationJobs.checkOverdueOnboardings();
  });

  // Daily at 11:00 AM - Check pending documents
  cron.schedule('0 11 * * *', async () => {
    console.log('Running scheduled job: Pending Documents');
    await notificationJobs.checkPendingDocuments();
  });

  console.log('All scheduled notification jobs started');
};

module.exports = { startScheduledJobs };