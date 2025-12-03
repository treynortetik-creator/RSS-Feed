const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const RSSGenerator = require('../utils/rssGenerator');

const db = getDb();

// Create a new bundle
exports.createBundle = async (req, res) => {
  try {
    const { name, description, feed_ids } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const bundleId = uuidv4();

    // Insert bundle
    db.run(
      `INSERT INTO feed_bundles (id, name, description)
       VALUES (?, ?, ?)`,
      [bundleId, name, description || ''],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create bundle' });
        }

        // Add feeds to bundle if provided
        if (feed_ids && Array.isArray(feed_ids) && feed_ids.length > 0) {
          const stmt = db.prepare(
            'INSERT INTO bundle_feeds (bundle_id, feed_id) VALUES (?, ?)'
          );

          feed_ids.forEach(feedId => {
            stmt.run(bundleId, feedId);
          });

          stmt.finalize();
        }

        res.status(201).json({
          id: bundleId,
          name,
          description: description || '',
          feed_count: feed_ids ? feed_ids.length : 0,
          rss_url: `/api/bundles/${bundleId}/rss`,
          message: 'Bundle created successfully'
        });
      }
    );
  } catch (error) {
    console.error('Error creating bundle:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all bundles
exports.getAllBundles = (req, res) => {
  db.all(
    `SELECT b.*, COUNT(bf.feed_id) as feed_count
     FROM feed_bundles b
     LEFT JOIN bundle_feeds bf ON b.id = bf.bundle_id
     GROUP BY b.id
     ORDER BY b.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve bundles' });
      }
      res.json({
        bundles: rows.map(bundle => ({
          ...bundle,
          rss_url: `/api/bundles/${bundle.id}/rss`
        }))
      });
    }
  );
};

// Get bundle by ID with feeds
exports.getBundleById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM feed_bundles WHERE id = ?', [id], (err, bundle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    // Get feeds in bundle
    db.all(
      `SELECT f.* FROM feeds f
       INNER JOIN bundle_feeds bf ON f.id = bf.feed_id
       WHERE bf.bundle_id = ?
       ORDER BY bf.added_at DESC`,
      [id],
      (err, feeds) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve bundle feeds' });
        }

        res.json({
          ...bundle,
          feeds: feeds,
          feed_count: feeds.length,
          rss_url: `/api/bundles/${bundle.id}/rss`
        });
      }
    );
  });
};

// Get RSS XML for a bundle (combines all feeds)
exports.getBundleRSS = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM feed_bundles WHERE id = ?', [id], (err, bundle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    // Get all items from all feeds in bundle
    db.all(
      `SELECT fi.*, f.name as feed_name
       FROM feed_items fi
       INNER JOIN feeds f ON fi.feed_id = f.id
       INNER JOIN bundle_feeds bf ON f.id = bf.feed_id
       WHERE bf.bundle_id = ?
       ORDER BY fi.pub_date DESC
       LIMIT 100`,
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve bundle items' });
        }

        const generator = new RSSGenerator({
          id: bundle.id,
          name: bundle.name,
          source_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/bundles/${bundle.id}`
        });

        // Add feed name to author for context
        const itemsWithContext = items.map(item => ({
          ...item,
          author: `${item.author || 'Unknown'} (${item.feed_name})`
        }));

        const xml = generator.generate(itemsWithContext);
        res.set('Content-Type', 'application/rss+xml');
        res.send(xml);
      }
    );
  });
};

// Add feed to bundle
exports.addFeedToBundle = (req, res) => {
  const { id } = req.params;
  const { feed_id } = req.body;

  if (!feed_id) {
    return res.status(400).json({ error: 'feed_id is required' });
  }

  // Check if bundle exists
  db.get('SELECT * FROM feed_bundles WHERE id = ?', [id], (err, bundle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    // Check if feed exists
    db.get('SELECT * FROM feeds WHERE id = ?', [feed_id], (err, feed) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!feed) {
        return res.status(404).json({ error: 'Feed not found' });
      }

      // Add feed to bundle
      db.run(
        'INSERT OR IGNORE INTO bundle_feeds (bundle_id, feed_id) VALUES (?, ?)',
        [id, feed_id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to add feed to bundle' });
          }
          res.json({ message: 'Feed added to bundle successfully' });
        }
      );
    });
  });
};

// Remove feed from bundle
exports.removeFeedFromBundle = (req, res) => {
  const { id, feed_id } = req.params;

  db.run(
    'DELETE FROM bundle_feeds WHERE bundle_id = ? AND feed_id = ?',
    [id, feed_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove feed from bundle' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Feed not in bundle' });
      }
      res.json({ message: 'Feed removed from bundle successfully' });
    }
  );
};

// Delete bundle
exports.deleteBundle = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM bundle_feeds WHERE bundle_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete bundle feeds' });
    }

    db.run('DELETE FROM feed_bundles WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete bundle' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bundle not found' });
      }
      res.json({ message: 'Bundle deleted successfully' });
    });
  });
};
