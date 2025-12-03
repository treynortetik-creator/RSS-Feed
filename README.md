# RSS Feed Aggregator

A free, open-source RSS feed generator that converts any webpage, social media profile, or keyword search into an RSS feed. Clone of rss.app but completely free!

## Features

### Core Features
- **Universal Feed Generation**: Convert any webpage into an RSS feed
- **Platform-Specific Scrapers**:
  - Twitter/X profiles
  - LinkedIn company pages
  - Reddit subreddits (with JSON API support)
  - YouTube channels
  - Google News searches
  - Generic web pages
- **Keyword-Based Feeds**: Create feeds from keywords that aggregate from multiple news sources
- **Feed Bundles**: Combine multiple feeds into a single RSS feed
- **Auto-Refresh Scheduling**: Automatic feed updates at configurable intervals
- **Web Interface**: Beautiful, intuitive UI for feed management
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

The application will be available at `http://localhost:3000`

## API Endpoints

### Feeds
- `POST /api/feeds/create` - Create a new RSS feed
- `GET /api/feeds` - List all feeds
- `GET /api/feeds/:id` - Get feed by ID with items
- `GET /api/feeds/:id/rss` - Get RSS XML for a feed
- `POST /api/feeds/:id/refresh` - Manually refresh a feed
- `DELETE /api/feeds/:id` - Delete a feed

### Bundles
- `POST /api/bundles/create` - Create a new feed bundle
- `GET /api/bundles` - List all bundles
- `GET /api/bundles/:id` - Get bundle by ID
- `GET /api/bundles/:id/rss` - Get RSS XML for bundled feeds
- `POST /api/bundles/:id/add` - Add feed to bundle
- `DELETE /api/bundles/:id/feeds/:feed_id` - Remove feed from bundle
- `DELETE /api/bundles/:id` - Delete bundle

## Usage Examples

### Create a Feed from a URL
```bash
curl -X POST http://localhost:3000/api/feeds/create \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://www.reddit.com/r/programming",
    "name": "Programming Subreddit"
  }'
```

### Create a Keyword-Based Feed
```bash
curl -X POST http://localhost:3000/api/feeds/create \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "keyword://artificial-intelligence",
    "name": "AI News",
    "config": {
      "keyword": "artificial intelligence",
      "sources": ["google-news", "bing-news"]
    }
  }'
```

### Create a Feed Bundle
```bash
curl -X POST http://localhost:3000/api/bundles/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech News Bundle",
    "description": "All my tech news feeds",
    "feed_ids": ["feed-id-1", "feed-id-2"]
  }'
```

## Configuration

Environment variables (`.env`):
```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/feeds.db
REFRESH_INTERVAL=3600000  # 1 hour in milliseconds
BASE_URL=http://localhost:3000
```

## Platform-Specific Notes

### Reddit
- Uses Reddit's JSON API when possible for better reliability
- Works with subreddits: `https://reddit.com/r/subreddit-name`

### Twitter/X
- Basic scraping support (Twitter heavily uses JavaScript rendering)
- Best results with nitter instances

### LinkedIn
- ⚠️ **NOT SUPPORTED** - LinkedIn company pages are not supported
- **Reason**: LinkedIn prohibits automated scraping and actively blocks it (403 errors)
- **Legal**: Violates LinkedIn's Terms of Service
- **See**: `LINKEDIN_RESEARCH.md` for full technical and legal analysis
- **Alternatives**:
  - Apply for LinkedIn Marketing API access (requires approval)
  - Use authorized third-party services
  - Manual content export

### YouTube
- Channel URLs: `https://youtube.com/@username` or `https://youtube.com/channel/ID`
- Extracts video data from page scripts

### Google News
- Automatically creates feeds from search queries
- Use with keyword config for best results

## Tech Stack

- **Backend**: Node.js + Express
- **Scraping**: Cheerio, Axios
- **RSS Generation**: rss npm package
- **Database**: SQLite
- **Scheduling**: Custom scheduler with configurable intervals
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Project Structure

```
RSS-Feed/
├── src/
│   ├── controllers/      # Request handlers
│   │   ├── feedController.js
│   │   └── bundleController.js
│   ├── routes/          # API routes
│   │   ├── feedRoutes.js
│   │   └── bundleRoutes.js
│   ├── scrapers/        # Platform-specific scrapers
│   │   ├── baseScraper.js
│   │   ├── webpageScraper.js
│   │   ├── twitterScraper.js
│   │   ├── linkedinScraper.js
│   │   ├── redditScraper.js
│   │   ├── youtubeScraper.js
│   │   ├── googleNewsScraper.js
│   │   └── keywordScraper.js
│   ├── database/        # Database setup
│   │   └── db.js
│   ├── utils/           # Utilities
│   │   ├── rssGenerator.js
│   │   ├── feedDetector.js
│   │   └── scheduler.js
│   └── server.js        # Main server file
├── public/              # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── package.json
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT
