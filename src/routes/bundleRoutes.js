const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundleController');

// Create a new bundle
router.post('/create', bundleController.createBundle);

// Get all bundles
router.get('/', bundleController.getAllBundles);

// Get bundle by ID
router.get('/:id', bundleController.getBundleById);

// Get RSS XML for a bundle
router.get('/:id/rss', bundleController.getBundleRSS);

// Add feed to bundle
router.post('/:id/add', bundleController.addFeedToBundle);

// Remove feed from bundle
router.delete('/:id/feeds/:feed_id', bundleController.removeFeedFromBundle);

// Delete bundle
router.delete('/:id', bundleController.deleteBundle);

module.exports = router;
