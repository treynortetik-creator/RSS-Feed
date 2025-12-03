const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const feedRoutes = require('./routes/feedRoutes');
const bundleRoutes = require('./routes/bundleRoutes');
const { initDatabase } = require('./database/db');
const FeedScheduler = require('./utils/scheduler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Routes
app.use('/api/feeds', feedRoutes);
app.use('/api/bundles', bundleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RSS Feed Aggregator is running' });
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 RSS Feed Aggregator running on http://localhost:${PORT}`);

    // Start feed scheduler for auto-refresh
    const scheduler = new FeedScheduler();
    scheduler.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      scheduler.stop();
      process.exit(0);
    });
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
