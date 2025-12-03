const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class WebpageScraper extends BaseScraper {
  parse($) {
    const items = [];
    const metadata = this.extractMetadata($);

    // Try to extract articles, blog posts, or content sections
    const contentSelectors = [
      'article',
      '.post',
      '.article',
      '.entry',
      '.content-item',
      'main article',
      '[role="article"]'
    ];

    let foundContent = false;

    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, elem) => {
          if (i >= 50) return false; // Limit to 50 items

          const $elem = $(elem);
          const item = {
            id: uuidv4(),
            title: this.extractTitle($elem, $),
            description: this.extractDescription($elem, $),
            link: this.extractLink($elem, $),
            pub_date: this.extractDate($elem, $) || new Date(),
            author: this.extractAuthor($elem, $),
            image_url: this.extractImage($elem, $)
          };

          if (item.title || item.description) {
            items.push(item);
            foundContent = true;
          }
        });

        if (foundContent) break;
      }
    }

    // If no structured content found, create a single item from the page
    if (items.length === 0) {
      items.push({
        id: uuidv4(),
        title: metadata.title,
        description: metadata.description,
        link: this.url,
        pub_date: new Date(),
        author: new URL(this.url).hostname,
        image_url: metadata.image
      });
    }

    return items;
  }

  extractTitle($elem, $) {
    const titleSelectors = ['h1', 'h2', 'h3', '.title', '.headline', '[itemprop="headline"]'];
    for (const sel of titleSelectors) {
      const title = $elem.find(sel).first().text().trim();
      if (title) return title;
    }
    return '';
  }

  extractDescription($elem, $) {
    const descSelectors = ['p', '.excerpt', '.summary', '[itemprop="description"]'];
    for (const sel of descSelectors) {
      const desc = $elem.find(sel).first().text().trim();
      if (desc && desc.length > 20) return desc.substring(0, 500);
    }
    return '';
  }

  extractLink($elem, $) {
    const link = $elem.find('a').first().attr('href') || $elem.attr('href');
    if (!link) return this.url;

    // Make absolute URL
    try {
      return new URL(link, this.url).href;
    } catch {
      return this.url;
    }
  }

  extractDate($elem, $) {
    const dateSelectors = ['time', '.date', '.published', '[itemprop="datePublished"]'];
    for (const sel of dateSelectors) {
      const dateElem = $elem.find(sel).first();
      const dateStr = dateElem.attr('datetime') || dateElem.text();
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return null;
  }

  extractAuthor($elem, $) {
    const authorSelectors = ['.author', '.by', '[itemprop="author"]', '[rel="author"]'];
    for (const sel of authorSelectors) {
      const author = $elem.find(sel).first().text().trim();
      if (author) return author;
    }
    return new URL(this.url).hostname;
  }

  extractImage($elem, $) {
    const imgSelectors = ['img', '[itemprop="image"]'];
    for (const sel of imgSelectors) {
      const img = $elem.find(sel).first().attr('src');
      if (img) {
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

module.exports = WebpageScraper;
