// cronJobs.js
const cron = require('node-cron');
const { checkStockLevels } = require('../controllers/productController');

// Schedule the task to run daily at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running stock level check...');
    checkStockLevels(); // Update alerts
});
