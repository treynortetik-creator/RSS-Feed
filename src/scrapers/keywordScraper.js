const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class KeywordScraper extends BaseScraper {
  constructor(url, config = {}) {
    super(url, config);
    this.keyword = config.keyword || '';
    this.sources = config.sources || ['google-news', 'bing-news'];
  }

  async scrape() {
    if (!this.keyword) {
      throw new Error('Keyword is required for keyword-based feeds');
    }

    const allItems = [];

    // Scrape from multiple sources
    for (const source of this.sources) {
      try {
        const items = await this.scrapeSource(source);
        allItems.push(...items);
      } catch (error) {
        console.error(`Failed to scrape ${source}:`, error.message);
      }
    }

    // Remove duplicates based on title similarity
    const uniqueItems = this.removeDuplicates(allItems);

    // Sort by date
    uniqueItems.sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));

    return uniqueItems.slice(0, 50);
  }

  async scrapeSource(source) {
    switch (source) {
      case 'google-news':
        return await this.scrapeGoogleNews();
      case 'bing-news':
        return await this.scrapeBingNews();
      default:
        return [];
    }
  }

  async scrapeGoogleNews() {
    const url = `https://news.google.com/search?q=${encodeURIComponent(this.keyword)}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const html = await this.fetchUrl(url);
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      const items = [];

      // Parse Google News results
      $('article').each((i, elem) => {
        if (i >= 25) return false;

        const $article = $(elem);
        const title = $article.find('h3, h4').first().text().trim();
        const link = $article.find('a').first().attr('href');

        if (title) {
          items.push({
            id: uuidv4(),
            title: title,
            description: $article.find('.xBbh9').first().text().trim() || '',
            link: link ? `https://news.google.com${link}` : url,
            pub_date: new Date(),
            author: $article.find('.wEwyrc').first().text().trim() || 'Google News',
            image_url: ''
          });
        }
      });

      return items;
    } catch (error) {
      console.error('Google News scraping error:', error);
      return [];
    }
  }

  async scrapeBingNews() {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(this.keyword)}`;

    try {
      const html = await this.fetchUrl(url);
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);
      const items = [];

      // Parse Bing News results
      $('.news-card').each((i, elem) => {
        if (i >= 25) return false;

        const $card = $(elem);
        const title = $card.find('.title').first().text().trim();
        const link = $card.find('a').first().attr('href');

        if (title) {
          items.push({
            id: uuidv4(),
            title: title,
            description: $card.find('.snippet').first().text().trim() || '',
            link: link || url,
            pub_date: this.parseBingDate($card.find('.source').text()) || new Date(),
            author: $card.find('.source').first().text().split('·')[0].trim() || 'Bing News',
            image_url: $card.find('img').first().attr('src') || ''
          });
        }
      });

      return items;
    } catch (error) {
      console.error('Bing News scraping error:', error);
      return [];
    }
  }

  async fetchUrl(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    return response.data;
  }

  parseBingDate(dateStr) {
    // Parse relative dates like "5h ago", "2d ago"
    const match = dateStr.match(/(\d+)([smhd])\s+ago/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const now = new Date();

    switch (unit) {
      case 's': return new Date(now - value * 1000);
      case 'm': return new Date(now - value * 60 * 1000);
      case 'h': return new Date(now - value * 60 * 60 * 1000);
      case 'd': return new Date(now - value * 24 * 60 * 60 * 1000);
    }

    return null;
  }

  removeDuplicates(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
      // Create a normalized title for comparison
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '').trim();

      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        unique.push(item);
      }
    }

    return unique;
  }

  parse($) {
    // Not used for keyword scraper
    return [];
  }
}

module.exports = KeywordScraper;
