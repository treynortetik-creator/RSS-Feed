const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class GoogleNewsScraper extends BaseScraper {
  constructor(url, config = {}) {
    super(url, config);

    // If keyword is provided in config, construct Google News search URL
    if (config.keyword) {
      this.url = `https://news.google.com/search?q=${encodeURIComponent(config.keyword)}&hl=en-US&gl=US&ceid=US:en`;
    }
  }

  parse($) {
    const items = [];

    // Google News article selectors
    const articleSelectors = [
      'article',
      '.xrnccd',
      '[jslog*="article"]'
    ];

    for (const selector of articleSelectors) {
      const articles = $(selector);
      if (articles.length > 0) {
        articles.each((i, elem) => {
          if (i >= 50) return false;

          const $article = $(elem);
          const item = {
            id: uuidv4(),
            title: this.extractArticleTitle($article, $),
            description: this.extractArticleDescription($article, $),
            link: this.extractArticleLink($article, $),
            pub_date: this.extractArticleDate($article, $) || new Date(),
            author: this.extractArticleSource($article, $),
            image_url: this.extractArticleImage($article, $)
          };

          if (item.title) {
            items.push(item);
          }
        });
        break;
      }
    }

    // Fallback: Try alternative selectors
    if (items.length === 0) {
      const linkElements = $('a[href*="/articles/"]');
      linkElements.each((i, elem) => {
        if (i >= 50) return;

        const $link = $(elem);
        const title = $link.text().trim();

        if (title && title.length > 10) {
          items.push({
            id: uuidv4(),
            title: title,
            description: '',
            link: this.makeAbsoluteUrl($link.attr('href')),
            pub_date: new Date(),
            author: 'Google News',
            image_url: ''
          });
        }
      });
    }

    return items;
  }

  extractArticleTitle($article, $) {
    const titleSelectors = [
      'h3',
      'h4',
      '.DY5T1d',
      'a.DY5T1d'
    ];

    for (const sel of titleSelectors) {
      const text = $article.find(sel).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  extractArticleDescription($article, $) {
    const descSelectors = [
      '.xBbh9',
      '.Rai5ob'
    ];

    for (const sel of descSelectors) {
      const text = $article.find(sel).first().text().trim();
      if (text && text.length > 10) return text.substring(0, 500);
    }
    return '';
  }

  extractArticleLink($article, $) {
    const link = $article.find('a').first().attr('href');
    return this.makeAbsoluteUrl(link);
  }

  extractArticleDate($article, $) {
    const dateSelectors = [
      'time',
      '.WW6dff',
      '.SVJrMe'
    ];

    for (const sel of dateSelectors) {
      const dateElem = $article.find(sel).first();
      const dateStr = dateElem.attr('datetime') || dateElem.text();

      if (dateStr) {
        // Try parsing as date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;

        // Try parsing relative time (e.g., "5 hours ago")
        const relativeDate = this.parseRelativeDate(dateStr);
        if (relativeDate) return relativeDate;
      }
    }
    return null;
  }

  parseRelativeDate(dateStr) {
    const now = new Date();
    const match = dateStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);

    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'second': return new Date(now - value * 1000);
        case 'minute': return new Date(now - value * 60 * 1000);
        case 'hour': return new Date(now - value * 60 * 60 * 1000);
        case 'day': return new Date(now - value * 24 * 60 * 60 * 1000);
        case 'week': return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
        case 'month': return new Date(now - value * 30 * 24 * 60 * 60 * 1000);
        case 'year': return new Date(now - value * 365 * 24 * 60 * 60 * 1000);
      }
    }

    return null;
  }

  extractArticleSource($article, $) {
    const sourceSelectors = [
      '.wEwyrc',
      '.vr1PYe'
    ];

    for (const sel of sourceSelectors) {
      const source = $article.find(sel).first().text().trim();
      if (source) return source;
    }
    return 'Google News';
  }

  extractArticleImage($article, $) {
    const img = $article.find('img').first().attr('src');
    if (img && !img.startsWith('data:')) {
      return this.makeAbsoluteUrl(img);
    }
    return '';
  }

  makeAbsoluteUrl(url) {
    if (!url) return this.url;

    try {
      if (url.startsWith('http')) {
        return url;
      }
      if (url.startsWith('./')) {
        return new URL(url, 'https://news.google.com').href;
      }
      if (url.startsWith('/')) {
        return `https://news.google.com${url}`;
      }
      return new URL(url, this.url).href;
    } catch {
      return this.url;
    }
  }
}

module.exports = GoogleNewsScraper;
