const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const RSSGenerator = require('../utils/rssGenerator');
const WebpageScraper = require('../scrapers/webpageScraper');
const TwitterScraper = require('../scrapers/twitterScraper');
const LinkedInScraper = require('../scrapers/linkedinScraper');
const RedditScraper = require('../scrapers/redditScraper');
const YouTubeScraper = require('../scrapers/youtubeScraper');
const GoogleNewsScraper = require('../scrapers/googleNewsScraper');
const KeywordScraper = require('../scrapers/keywordScraper');
const { detectFeedType } = require('../utils/feedDetector');

const db = getDb();

// Create a new feed
exports.createFeed = async (req, res) => {
  try {
    const { name, source_url, feed_type, config } = req.body;

    if (!source_url) {
      return res.status(400).json({ error: 'source_url is required' });
    }

    const feedId = uuidv4();
    const detectedType = feed_type || detectFeedType(source_url, config);

    // Block LinkedIn feeds with clear explanation
    if (detectedType === 'linkedin') {
      return res.status(400).json({
        error: 'LinkedIn company pages are not supported',
        reason: 'LinkedIn prohibits automated scraping and requires official API access',
        details: [
          'LinkedIn actively blocks automated data collection (403 Forbidden errors)',
          'Scraping violates LinkedIn Terms of Service and can result in account bans',
          'LinkedIn uses heavy JavaScript rendering that cannot be scraped with basic tools'
        ],
        alternatives: [
          'Apply for LinkedIn Marketing API access: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access',
          'Use LinkedIn\'s native RSS features (if available for your account)',
          'Use authorized third-party services that have API partnerships with LinkedIn',
          'Manually export or copy content you need'
        ],
        documentation: 'See LINKEDIN_RESEARCH.md for full technical and legal analysis'
      });
    }

    // Insert feed into database
    db.run(
      `INSERT INTO feeds (id, name, source_url, feed_type, config, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        feedId,
        name || `Feed for ${source_url}`,
        source_url,
        detectedType,
        JSON.stringify(config || {}),
        'active'
      ],
      async function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create feed' });
        }

        // Scrape initial content
        try {
          await scrapeFeedContent(feedId, source_url, detectedType, config);

          res.status(201).json({
            id: feedId,
            name: name || `Feed for ${source_url}`,
            source_url,
            feed_type: detectedType,
            rss_url: `/api/feeds/${feedId}/rss`,
            message: 'Feed created successfully'
          });
        } catch (scrapeErr) {
          console.error('Scraping error:', scrapeErr);
          // Feed created but scraping failed
          res.status(201).json({
            id: feedId,
            name: name || `Feed for ${source_url}`,
            source_url,
            feed_type: detectedType,
            rss_url: `/api/feeds/${feedId}/rss`,
            warning: 'Feed created but initial scraping failed'
          });
        }
      }
    );
  } catch (error) {
    console.error('Error creating feed:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all feeds
exports.getAllFeeds = (req, res) => {
  db.all('SELECT * FROM feeds ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve feeds' });
    }
    res.json({
      feeds: rows.map(feed => ({
        ...feed,
        config: JSON.parse(feed.config || '{}'),
        rss_url: `/api/feeds/${feed.id}/rss`
      }))
    });
  });
};

// Get feed by ID
exports.getFeedById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM feeds WHERE id = ?', [id], (err, feed) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    db.all(
      'SELECT * FROM feed_items WHERE feed_id = ? ORDER BY pub_date DESC LIMIT 50',
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve feed items' });
        }

        res.json({
          ...feed,
          config: JSON.parse(feed.config || '{}'),
          items: items,
          rss_url: `/api/feeds/${feed.id}/rss`
        });
      }
    );
  });
};

// Get RSS XML for a feed
exports.getFeedRSS = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM feeds WHERE id = ?', [id], (err, feed) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    db.all(
      'SELECT * FROM feed_items WHERE feed_id = ? ORDER BY pub_date DESC LIMIT 50',
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve feed items' });
        }

        const generator = new RSSGenerator({
          ...feed,
          config: JSON.parse(feed.config || '{}')
        });

        const xml = generator.generate(items);
        res.set('Content-Type', 'application/rss+xml');
        res.send(xml);
      }
    );
  });
};

// Refresh feed content
exports.refreshFeed = async (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM feeds WHERE id = ?', [id], async (err, feed) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    try {
      const config = JSON.parse(feed.config || '{}');
      await scrapeFeedContent(feed.id, feed.source_url, feed.feed_type, config);

      db.run(
        'UPDATE feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      res.json({ message: 'Feed refreshed successfully' });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh feed: ' + error.message });
    }
  });
};

// Delete feed
exports.deleteFeed = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM feed_items WHERE feed_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete feed items' });
    }

    db.run('DELETE FROM feeds WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete feed' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Feed not found' });
      }
      res.json({ message: 'Feed deleted successfully' });
    });
  });
};

// Helper function to scrape feed content
async function scrapeFeedContent(feedId, sourceUrl, feedType, config) {
  let scraper;

  // Select appropriate scraper based on feed type
  switch (feedType) {
    case 'twitter':
      scraper = new TwitterScraper(sourceUrl, config);
      break;
    case 'linkedin':
      // This should never be reached due to check in createFeed,
      // but keeping as fallback for manual refresh attempts
      throw new Error('LinkedIn scraping is not supported. See LINKEDIN_RESEARCH.md for details.');
    case 'reddit':
      scraper = new RedditScraper(sourceUrl, config);
      break;
    case 'youtube':
      scraper = new YouTubeScraper(sourceUrl, config);
      break;
    case 'google-news':
      scraper = new GoogleNewsScraper(sourceUrl, config);
      break;
    case 'keyword':
      scraper = new KeywordScraper(sourceUrl, config);
      break;
    case 'webpage':
    default:
      scraper = new WebpageScraper(sourceUrl, config);
      break;
  }

  const items = await scraper.scrape();

  // Delete old items
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM feed_items WHERE feed_id = ?', [feedId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Insert new items
  const stmt = db.prepare(
    `INSERT INTO feed_items (id, feed_id, title, description, link, pub_date, author, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const item of items) {
    stmt.run(
      item.id,
      feedId,
      item.title,
      item.description,
      item.link,
      item.pub_date,
      item.author,
      item.image_url
    );
  }

  stmt.finalize();
}
