function detectFeedType(url, config = {}) {
  // If keyword is provided in config, it's a keyword-based feed
  if (config.keyword) {
    return 'keyword';
  }

  const urlLower = url.toLowerCase();

  if (urlLower.includes('linkedin.com/company')) {
    return 'linkedin';
  } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return 'twitter';
  } else if (urlLower.includes('instagram.com')) {
    return 'instagram';
  } else if (urlLower.includes('reddit.com/r/')) {
    return 'reddit';
  } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  } else if (urlLower.includes('facebook.com')) {
    return 'facebook';
  } else if (urlLower.includes('tiktok.com')) {
    return 'tiktok';
  } else if (urlLower.includes('news.google.com')) {
    return 'google-news';
  } else {
    return 'webpage';
  }
}

module.exports = { detectFeedType };
