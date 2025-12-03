# RSS Feed Aggregator

A free, open-source RSS feed generator that converts any webpage, social media profile, or keyword search into an RSS feed.

## Features

- **Universal Feed Generation**: Convert any webpage into an RSS feed
- **Platform-Specific Scrapers**: Support for LinkedIn, Twitter/X, Instagram, Reddit, YouTube, and more
- **Keyword Tracking**: Create feeds based on topics and keywords
- **Feed Management**: Organize, customize, and bundle multiple feeds
- **Free Forever**: No paywalls, completely open-source

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

## API Endpoints

- `POST /api/feeds/create` - Create a new RSS feed
- `GET /api/feeds/:id` - Get feed by ID
- `GET /api/feeds/:id/rss` - Get RSS XML for a feed
- `GET /api/feeds` - List all feeds
- `DELETE /api/feeds/:id` - Delete a feed

## Tech Stack

- **Backend**: Node.js + Express
- **Scraping**: Cheerio, Puppeteer, Axios
- **RSS Generation**: rss npm package
- **Database**: SQLite
- **Frontend**: HTML/CSS/JavaScript (coming soon)

## License

MIT
