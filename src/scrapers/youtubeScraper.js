const BaseScraper = require('./baseScraper');
const { v4: uuidv4 } = require('uuid');

class YouTubeScraper extends BaseScraper {
  async scrape() {
    // Extract channel ID or username from URL
    const channelInfo = this.extractChannelInfo();

    try {
      const html = await this.fetch();
      const $ = require('cheerio').load(html);
      return this.parse($, channelInfo);
    } catch (error) {
      // If scraping fails, create a basic feed item
      return [{
        id: uuidv4(),
        title: `YouTube Channel: ${channelInfo.name}`,
        description: 'Unable to fetch recent videos. YouTube requires authentication for detailed scraping.',
        link: this.url,
        pub_date: new Date(),
        author: channelInfo.name,
        image_url: ''
      }];
    }
  }

  extractChannelInfo() {
    // Extract channel name/ID from various YouTube URL formats
    // youtube.com/c/ChannelName, youtube.com/@username, youtube.com/channel/ID
    let name = 'YouTube Channel';

    const patterns = [
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/user\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
      const match = this.url.match(pattern);
      if (match) {
        name = match[1].replace(/-/g, ' ');
        break;
      }
    }

    return { name };
  }

  parse($, channelInfo) {
    const items = [];

    // Try to extract video data from the page
    // YouTube heavily relies on JavaScript, so this is limited
    try {
      // Look for initial data in script tags
      const scripts = $('script');
      let videoData = [];

      scripts.each((i, script) => {
        const content = $(script).html();
        if (content && content.includes('var ytInitialData')) {
          try {
            // Extract JSON data from the script
            const match = content.match(/var ytInitialData = ({.+?});/);
            if (match) {
              const data = JSON.parse(match[1]);
              videoData = this.extractVideosFromData(data);
            }
          } catch (e) {
            // Continue if parsing fails
          }
        }
      });

      // Convert video data to feed items
      videoData.forEach((video, i) => {
        if (i >= 50) return;

        items.push({
          id: uuidv4(),
          title: video.title || 'Untitled Video',
          description: video.description || '',
          link: video.url || this.url,
          pub_date: video.publishedAt || new Date(),
          author: channelInfo.name,
          image_url: video.thumbnail || ''
        });
      });
    } catch (error) {
      console.error('YouTube parsing error:', error);
    }

    // Fallback: create a single item if no videos found
    if (items.length === 0) {
      const metadata = this.extractMetadata($);
      items.push({
        id: uuidv4(),
        title: metadata.title || `${channelInfo.name} YouTube Channel`,
        description: metadata.description || 'Subscribe to this YouTube channel for updates.',
        link: this.url,
        pub_date: new Date(),
        author: channelInfo.name,
        image_url: metadata.image || ''
      });
    }

    return items;
  }

  extractVideosFromData(data) {
    const videos = [];

    try {
      // Navigate through YouTube's data structure to find videos
      // This is a simplified version and may need updates as YouTube changes their structure
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

      for (const tab of tabs) {
        const content = tab?.tabRenderer?.content?.richGridRenderer?.contents ||
                       tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const item of content) {
          const videoRenderer = item?.richItemRenderer?.content?.videoRenderer ||
                               item?.itemSectionRenderer?.contents?.[0]?.videoRenderer;

          if (videoRenderer) {
            videos.push({
              title: videoRenderer.title?.runs?.[0]?.text || videoRenderer.title?.simpleText,
              description: videoRenderer.descriptionSnippet?.runs?.map(r => r.text).join('') || '',
              url: videoRenderer.videoId ? `https://www.youtube.com/watch?v=${videoRenderer.videoId}` : '',
              thumbnail: videoRenderer.thumbnail?.thumbnails?.[0]?.url || '',
              publishedAt: this.parseYouTubeDate(videoRenderer.publishedTimeText?.simpleText)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting video data:', error);
    }

    return videos;
  }

  parseYouTubeDate(dateText) {
    if (!dateText) return new Date();

    // Parse relative dates like "2 days ago", "1 week ago"
    const now = new Date();
    const match = dateText.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);

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

    return new Date();
  }
}

module.exports = YouTubeScraper;
