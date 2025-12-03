const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class LinkedInScraper extends BaseScraper {
  parse($) {
    const items = [];

    // LinkedIn post selectors
    const postSelectors = [
      '.feed-shared-update-v2',
      '[data-urn*="activity"]',
      '.occludable-update'
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
            pub_date: this.extractPostDate($post, $) || new Date(),
            author: this.extractPostAuthor($post, $),
            image_url: this.extractPostImage($post, $)
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
        author: this.extractCompanyName(),
        image_url: metadata.image
      });
    }

    return items;
  }

  extractCompanyName() {
    // Extract company name from URL like linkedin.com/company/company-name
    const match = this.url.match(/linkedin\.com\/company\/([^\/\?]+)/);
    return match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'LinkedIn Company';
  }

  extractPostTitle($post, $) {
    const titleSelectors = [
      '.feed-shared-text__text-view',
      '.feed-shared-inline-show-more-text',
      '[data-test-id="main-feed-activity-card__commentary"]'
    ];

    for (const sel of titleSelectors) {
      const text = $post.find(sel).first().text().trim();
      if (text) return text.substring(0, 200);
    }
    return '';
  }

  extractPostDescription($post, $) {
    const descSelectors = [
      '.feed-shared-text__text-view',
      '.feed-shared-update-v2__description'
    ];

    for (const sel of descSelectors) {
      const text = $post.find(sel).first().text().trim();
      if (text && text.length > 20) return text.substring(0, 500);
    }
    return '';
  }

  extractPostLink($post, $) {
    const link = $post.find('a[href*="/feed/update/"]').first().attr('href');
    if (!link) return this.url;

    try {
      return new URL(link, 'https://www.linkedin.com').href;
    } catch {
      return this.url;
    }
  }

  extractPostDate($post, $) {
    const timeSelectors = [
      'time',
      '.feed-shared-actor__sub-description time',
      '[data-test-id="feed-shared-actor__sub-description"] time'
    ];

    for (const sel of timeSelectors) {
      const time = $post.find(sel).first().attr('datetime');
      if (time) {
        const date = new Date(time);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return null;
  }

  extractPostAuthor($post, $) {
    const authorSelectors = [
      '.feed-shared-actor__name',
      '[data-test-id="feed-shared-actor__name"]'
    ];

    for (const sel of authorSelectors) {
      const author = $post.find(sel).first().text().trim();
      if (author) return author;
    }
    return this.extractCompanyName();
  }

  extractPostImage($post, $) {
    const imgSelectors = [
      '.feed-shared-image__image',
      'img[src*="media"]'
    ];

    for (const sel of imgSelectors) {
      const img = $post.find(sel).first().attr('src');
      if (img && !img.includes('data:image')) {
        try {
          return new URL(img, this.url).href;
        } catch {
          return '';
        }
      }
    }
    return '';
  }
}

module.exports = LinkedInScraper;
