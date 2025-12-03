const RSS = require('rss');

class RSSGenerator {
  constructor(feedConfig) {
    this.feedConfig = feedConfig;
  }

  generate(items) {
    const feed = new RSS({
      title: this.feedConfig.name || 'Custom RSS Feed',
      description: `RSS feed for ${this.feedConfig.source_url}`,
      feed_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/feeds/${this.feedConfig.id}/rss`,
      site_url: this.feedConfig.source_url,
      language: 'en',
      pubDate: new Date(),
      ttl: 60
    });

    items.forEach(item => {
      feed.item({
        title: item.title || 'No title',
        description: item.description || '',
        url: item.link || this.feedConfig.source_url,
        date: item.pub_date || new Date(),
        author: item.author || 'Unknown',
        enclosure: item.image_url ? {
          url: item.image_url,
          type: 'image/jpeg'
        } : undefined
      });
    });

    return feed.xml({ indent: true });
  }
}

module.exports = RSSGenerator;
