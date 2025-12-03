const { getDb } = require('../database/db');
const WebpageScraper = require('../scrapers/webpageScraper');
const TwitterScraper = require('../scrapers/twitterScraper');
const LinkedInScraper = require('../scrapers/linkedinScraper');
const RedditScraper = require('../scrapers/redditScraper');
const YouTubeScraper = require('../scrapers/youtubeScraper');
const GoogleNewsScraper = require('../scrapers/googleNewsScraper');
const KeywordScraper = require('../scrapers/keywordScraper');

const db = getDb();

class FeedScheduler {
  constructor() {
    this.intervals = new Map();
    this.defaultInterval = parseInt(process.env.REFRESH_INTERVAL) || 3600000; // 1 hour default
  }

  start() {
    console.log('🕐 Feed scheduler started');

    // Run initial refresh for all active feeds
    this.refreshAllFeeds();

    // Schedule periodic refreshes
    this.scheduleAllFeeds();

    // Re-schedule every hour to pick up new feeds
    setInterval(() => {
      this.scheduleAllFeeds();
    }, 3600000); // Check for new feeds every hour
  }

  scheduleAllFeeds() {
    db.all('SELECT id, feed_type, source_url, config FROM feeds WHERE status = ?', ['active'], (err, feeds) => {
      if (err) {
        console.error('Error fetching feeds for scheduling:', err);
        return;
      }

      feeds.forEach(feed => {
        if (!this.intervals.has(feed.id)) {
          this.scheduleFeed(feed);
        }
      });
    });
  }

  scheduleFeed(feed) {
    const config = JSON.parse(feed.config || '{}');
    const interval = config.refresh_interval || this.defaultInterval;

    const intervalId = setInterval(async () => {
      await this.refreshFeed(feed);
    }, interval);

    this.intervals.set(feed.id, intervalId);
    console.log(`📅 Scheduled feed ${feed.id} for refresh every ${interval / 1000 / 60} minutes`);
  }

  unscheduleFeed(feedId) {
    if (this.intervals.has(feedId)) {
      clearInterval(this.intervals.get(feedId));
      this.intervals.delete(feedId);
      console.log(`⏹️  Unscheduled feed ${feedId}`);
    }
  }

  async refreshFeed(feed) {
    try {
      console.log(`🔄 Auto-refreshing feed: ${feed.id}`);

      const config = JSON.parse(feed.config || '{}');
      let scraper;

      // Select appropriate scraper
      switch (feed.feed_type) {
        case 'twitter':
          scraper = new TwitterScraper(feed.source_url, config);
          break;
        case 'linkedin':
          scraper = new LinkedInScraper(feed.source_url, config);
          break;
        case 'reddit':
          scraper = new RedditScraper(feed.source_url, config);
          break;
        case 'youtube':
          scraper = new YouTubeScraper(feed.source_url, config);
          break;
        case 'google-news':
          scraper = new GoogleNewsScraper(feed.source_url, config);
          break;
        case 'keyword':
          scraper = new KeywordScraper(feed.source_url, config);
          break;
        default:
          scraper = new WebpageScraper(feed.source_url, config);
          break;
      }

      const items = await scraper.scrape();

      // Delete old items
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM feed_items WHERE feed_id = ?', [feed.id], (err) => {
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
          feed.id,
          item.title,
          item.description,
          item.link,
          item.pub_date,
          item.author,
          item.image_url
        );
      }

      stmt.finalize();

      // Update last_fetched timestamp
      db.run('UPDATE feeds SET last_fetched = CURRENT_TIMESTAMP WHERE id = ?', [feed.id]);

      console.log(`✅ Feed ${feed.id} refreshed successfully (${items.length} items)`);
    } catch (error) {
      console.error(`❌ Error refreshing feed ${feed.id}:`, error.message);
    }
  }

  async refreshAllFeeds() {
    db.all('SELECT * FROM feeds WHERE status = ?', ['active'], async (err, feeds) => {
      if (err) {
        console.error('Error fetching feeds:', err);
        return;
      }

      console.log(`🔄 Refreshing ${feeds.length} active feeds...`);

      for (const feed of feeds) {
        await this.refreshFeed(feed);
      }

      console.log('✅ All feeds refreshed');
    });
  }

  stop() {
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    console.log('⏹️  Feed scheduler stopped');
  }
}

module.exports = FeedScheduler;
