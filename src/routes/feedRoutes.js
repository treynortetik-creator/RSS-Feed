const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');

// Create a new feed
router.post('/create', feedController.createFeed);

// Get all feeds
router.get('/', feedController.getAllFeeds);

// Get feed by ID
router.get('/:id', feedController.getFeedById);

// Get RSS XML for a feed
router.get('/:id/rss', feedController.getFeedRSS);

// Refresh feed content
router.post('/:id/refresh', feedController.refreshFeed);

// Delete feed
router.delete('/:id', feedController.deleteFeed);

module.exports = router;
