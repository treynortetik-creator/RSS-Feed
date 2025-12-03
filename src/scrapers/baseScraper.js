const axios = require('axios');
const cheerio = require('cheerio');

class BaseScraper {
  constructor(url, config = {}) {
    this.url = url;
    this.config = config;
  }

  async fetch() {
    try {
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  }

  async scrape() {
    const html = await this.fetch();
    const $ = cheerio.load(html);
    return this.parse($);
  }

  parse($) {
    // Override in child classes
    return [];
  }

  extractMetadata($) {
    return {
      title: $('title').text() || $('meta[property="og:title"]').attr('content') || 'Untitled',
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || ''
    };
  }
}

module.exports = BaseScraper;
