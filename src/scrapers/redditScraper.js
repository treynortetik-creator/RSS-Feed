const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class RedditScraper extends BaseScraper {
  async fetch() {
    // Use Reddit's JSON API for better reliability
    let apiUrl = this.url;

    // Convert regular Reddit URL to JSON API
    if (!apiUrl.endsWith('.json')) {
      apiUrl = apiUrl.replace(/\/$/, '') + '.json';
    }

    try {
      const axios = require('axios');
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSSFeedBot/1.0)'
        },
        timeout: 15000
      });

      // Reddit JSON API returns data in a specific format
      if (response.data && response.data.data && response.data.data.children) {
        return response.data;
      }

      // Fallback to HTML scraping
      return await super.fetch();
    } catch (error) {
      // Fallback to HTML scraping
      return await super.fetch();
    }
  }

  async scrape() {
    const data = await this.fetch();

    // If we got JSON data from Reddit API
    if (data && data.data && data.data.children) {
      return this.parseJSON(data);
    }

    // Otherwise use HTML parsing
    const cheerio = require('cheerio');
    const $ = cheerio.load(data);
    return this.parse($);
  }

  parseJSON(data) {
    const items = [];

    data.data.children.forEach((child, i) => {
      if (i >= 50) return;

      const post = child.data;
      items.push({
        id: uuidv4(),
        title: post.title || 'Untitled',
        description: this.cleanRedditText(post.selftext || post.title || ''),
        link: post.url || `https://reddit.com${post.permalink}`,
        pub_date: new Date(post.created_utc * 1000),
        author: post.author ? `u/${post.author}` : 'Unknown',
        image_url: this.extractImageFromPost(post)
      });
    });

    return items;
  }

  parse($) {
    const items = [];

    // Reddit post selectors
    const postSelectors = [
      '[data-testid="post-container"]',
      '.Post',
      'div[id*="thing_"]'
    ];

    for (const selector of postSelectors) {
      const posts = $(selector);
      if (posts.length > 0) {
        posts.each((i, elem) => {
          if (i >= 50) return false;

          const $post = $(elem);
          const item = {
            id: uuidv4(),
            title: this.extractPostTitle($post, $),
            description: this.extractPostDescription($post, $),
            link: this.extractPostLink($post, $),
            pub_date: new Date(),
            author: this.extractPostAuthor($post, $),
            image_url: this.extractPostImage($post, $)
          };

          if (item.title) {
            items.push(item);
          }
        });
        break;
      }
    }

    return items;
  }

  cleanRedditText(text) {
    // Remove markdown and limit length
    return text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
      .replace(/[#*_~`]/g, '') // Remove markdown formatting
      .substring(0, 500);
  }

  extractImageFromPost(post) {
    if (post.preview && post.preview.images && post.preview.images[0]) {
      return post.preview.images[0].source.url.replace(/&amp;/g, '&');
    }
    if (post.thumbnail && post.thumbnail.startsWith('http')) {
      return post.thumbnail;
    }
    return '';
  }

  extractPostTitle($post, $) {
    const titleSelectors = [
      '[data-testid="post-content"] h3',
      '.title',
      'h3'
    ];

    for (const sel of titleSelectors) {
      const text = $post.find(sel).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  extractPostDescription($post, $) {
    const descSelectors = [
      '[data-testid="post-content"] > div',
      '.usertext-body',
      '.expando'
    ];

    for (const sel of descSelectors) {
      const text = $post.find(sel).first().text().trim();
      if (text && text.length > 20) return this.cleanRedditText(text);
    }
    return '';
  }

  extractPostLink($post, $) {
    const link = $post.find('a[data-click-id="body"]').first().attr('href') ||
                 $post.find('a.title').first().attr('href');

    if (!link) return this.url;

    try {
      if (link.startsWith('/r/')) {
        return `https://reddit.com${link}`;
      }
      return new URL(link, this.url).href;
    } catch {
      return this.url;
    }
  }

  extractPostAuthor($post, $) {
    const author = $post.find('[data-testid="post_author_link"]').first().text().trim() ||
                   $post.find('.author').first().text().trim();
    return author ? `u/${author.replace('u/', '')}` : 'Unknown';
  }

  extractPostImage($post, $) {
    const img = $post.find('img[src*="redd"]').first().attr('src');
    if (img) {
      return img.replace(/&amp;/g, '&');
    }
    return '';
  }
}

module.exports = RedditScraper;
