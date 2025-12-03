const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class TwitterScraper extends BaseScraper {
  parse($) {
    const items = [];

    // Try to find tweet containers
    // Note: Twitter heavily uses JavaScript rendering, so this will work best with nitter instances
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      '.tweet',
      '[data-tweet-id]'
    ];

    for (const selector of tweetSelectors) {
      const tweets = $(selector);
      if (tweets.length > 0) {
        tweets.each((i, elem) => {
          if (i >= 50) return false;

          const $tweet = $(elem);
          const item = {
            id: uuidv4(),
            title: this.extractTweetText($tweet, $),
            description: this.extractTweetText($tweet, $),
            link: this.extractTweetLink($tweet, $),
            pub_date: this.extractTweetDate($tweet, $) || new Date(),
            author: this.extractTweetAuthor($tweet, $),
            image_url: this.extractTweetImage($tweet, $)
          };

          if (item.title || item.description) {
            items.push(item);
          }
        });
        break;
      }
    }

    // Fallback: create single item from page metadata
    if (items.length === 0) {
      const metadata = this.extractMetadata($);
      items.push({
        id: uuidv4(),
        title: metadata.title,
        description: metadata.description,
        link: this.url,
        pub_date: new Date(),
        author: this.extractUsername(),
        image_url: metadata.image
      });
    }

    return items;
  }

  extractUsername() {
    // Extract username from URL like twitter.com/username or x.com/username
    const match = this.url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
    return match ? `@${match[1]}` : 'Unknown';
  }

  extractTweetText($tweet, $) {
    const textSelectors = [
      '[data-testid="tweetText"]',
      '.tweet-text',
      '.content'
    ];

    for (const sel of textSelectors) {
      const text = $tweet.find(sel).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  extractTweetLink($tweet, $) {
    const link = $tweet.find('a[href*="/status/"]').first().attr('href');
    if (!link) return this.url;

    try {
      return new URL(link, this.url).href;
    } catch {
      return this.url;
    }
  }

  extractTweetDate($tweet, $) {
    const time = $tweet.find('time').first().attr('datetime');
    if (time) {
      const date = new Date(time);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  }

  extractTweetAuthor($tweet, $) {
    const author = $tweet.find('[data-testid="User-Name"]').first().text().trim();
    return author || this.extractUsername();
  }

  extractTweetImage($tweet, $) {
    const img = $tweet.find('img[src*="media"]').first().attr('src');
    if (img) {
      try {
        return new URL(img, this.url).href;
      } catch {
        return '';
      }
    }
    return '';
  }
}

module.exports = TwitterScraper;
