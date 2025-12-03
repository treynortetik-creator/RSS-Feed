// App State
const state = {
    currentView: 'generator',
    currentFeed: null,
    feeds: []
};

// API Base URL
const API_BASE = window.location.origin + '/api/feeds';

// DOM Elements
const views = {
    generator: document.getElementById('generatorView'),
    feeds: document.getElementById('feedsView'),
    detail: document.getElementById('feedDetailView')
};

const elements = {
    urlInput: document.getElementById('urlInput'),
    generateBtn: document.getElementById('generateBtn'),
    feedGrid: document.getElementById('feedGrid'),
    feedsList: document.getElementById('feedsList'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    newFeedBtn: document.getElementById('newFeedBtn'),
    backBtn: document.getElementById('backBtn'),
    copyBtn: document.getElementById('copyBtn'),
    refreshFeedBtn: document.getElementById('refreshFeedBtn'),
    deleteFeedBtn: document.getElementById('deleteFeedBtn'),
    refreshAllBtn: document.getElementById('refreshAllBtn')
};

// Initialize App
function init() {
    setupEventListeners();
    loadFeeds();
}

// Setup Event Listeners
function setupEventListeners() {
    // Generate button
    elements.generateBtn.addEventListener('click', handleGenerate);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGenerate();
    });

    // Feed cards
    elements.feedGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.feed-card');
        if (card) {
            const platform = card.dataset.platform;
            const url = elements.urlInput.value.trim();
            if (url) {
                createFeed(url, platform);
            } else {
                showToast('Please enter a URL first', 'error');
            }
        }
    });

    // Navigation
    elements.newFeedBtn.addEventListener('click', () => switchView('generator'));
    elements.backBtn.addEventListener('click', () => switchView('feeds'));

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (page === 'feeds') {
                switchView('feeds');
                loadFeeds();
            } else if (page === 'explore') {
                switchView('generator');
            }
        });
    });

    // Feed detail actions
    elements.copyBtn.addEventListener('click', copyFeedUrl);
    elements.refreshFeedBtn.addEventListener('click', refreshCurrentFeed);
    elements.deleteFeedBtn.addEventListener('click', deleteCurrentFeed);
    elements.refreshAllBtn.addEventListener('click', refreshAllFeeds);
}

// Handle Generate
async function handleGenerate() {
    const url = elements.urlInput.value.trim();
    if (!url) {
        showToast('Please enter a URL', 'error');
        return;
    }

    await createFeed(url, 'webpage');
}

// Create Feed
async function createFeed(sourceUrl, feedType) {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Feed for ${sourceUrl}`,
                source_url: sourceUrl,
                feed_type: feedType
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Feed created successfully!');
            state.currentFeed = data;
            await loadFeedDetail(data.id);
            switchView('detail');
        } else {
            // Show detailed error for unsupported platforms like LinkedIn
            if (data.alternatives && data.details) {
                let errorMsg = `${data.error}\n\nReason: ${data.reason}\n\n`;
                errorMsg += 'Details:\n' + data.details.map(d => `• ${d}`).join('\n') + '\n\n';
                errorMsg += 'Alternatives:\n' + data.alternatives.map(a => `• ${a}`).join('\n');
                alert(errorMsg);
                showToast(data.error, 'error');
            } else {
                showToast(data.error || 'Failed to create feed', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating feed:', error);
        showToast('Error creating feed', 'error');
    } finally {
        showLoading(false);
    }
}

// Load Feeds
async function loadFeeds() {
    try {
        const response = await fetch(`${API_BASE}/`);
        const data = await response.json();
        state.feeds = data.feeds;
        renderFeeds(data.feeds);
    } catch (error) {
        console.error('Error loading feeds:', error);
        showToast('Error loading feeds', 'error');
    }
}

// Render Feeds
function renderFeeds(feeds) {
    if (feeds.length === 0) {
        elements.feedsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>No feeds yet</h2>
                <p style="color: var(--text-secondary); margin: 10px 0;">Create your first RSS feed to get started</p>
                <button class="btn-primary" onclick="switchView('generator')">Create Feed</button>
            </div>
        `;
        return;
    }

    elements.feedsList.innerHTML = feeds.map(feed => `
        <div class="feed-item" onclick="loadFeedDetail('${feed.id}')">
            <div class="feed-item-header">
                <div class="feed-item-title">${feed.name}</div>
                <span class="feed-status" style="color: ${feed.status === 'active' ? '#10B981' : '#EF4444'}">
                    ${feed.status === 'active' ? '●' : '○'}
                </span>
            </div>
            <div class="feed-item-url">${feed.source_url}</div>
            <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                Type: ${feed.feed_type} | Created: ${new Date(feed.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

// Load Feed Detail
async function loadFeedDetail(feedId) {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/${feedId}`);
        const feed = await response.json();

        state.currentFeed = feed;
        document.getElementById('feedTitle').textContent = feed.name;
        document.getElementById('feedUrl').value = `${window.location.origin}${feed.rss_url}`;

        renderFeedItems(feed.items);
        switchView('detail');
    } catch (error) {
        console.error('Error loading feed detail:', error);
        showToast('Error loading feed detail', 'error');
    } finally {
        showLoading(false);
    }
}

// Render Feed Items
function renderFeedItems(items) {
    const container = document.getElementById('feedItems');

    if (items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No items yet. Try refreshing the feed.</p>';
        return;
    }

    container.innerHTML = `
        <h3 style="margin-bottom: 20px;">Feed Items (${items.length})</h3>
        ${items.map(item => `
            <div class="feed-item-card">
                <h3>${item.title || 'Untitled'}</h3>
                <p>${item.description || ''}</p>
                ${item.link ? `<a href="${item.link}" target="_blank" style="color: var(--primary-color); font-size: 14px;">View →</a>` : ''}
                <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                    ${item.author ? `By ${item.author} | ` : ''}${new Date(item.pub_date).toLocaleString()}
                </div>
            </div>
        `).join('')}
    `;
}

// Copy Feed URL
function copyFeedUrl() {
    const input = document.getElementById('feedUrl');
    input.select();
    document.execCommand('copy');
    showToast('Feed URL copied to clipboard!');
}

// Refresh Current Feed
async function refreshCurrentFeed() {
    if (!state.currentFeed) return;

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/${state.currentFeed.id}/refresh`, {
            method: 'POST'
        });

        if (response.ok) {
            showToast('Feed refreshed successfully!');
            await loadFeedDetail(state.currentFeed.id);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to refresh feed', 'error');
        }
    } catch (error) {
        console.error('Error refreshing feed:', error);
        showToast('Error refreshing feed', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete Current Feed
async function deleteCurrentFeed() {
    if (!state.currentFeed) return;

    if (!confirm('Are you sure you want to delete this feed?')) return;

    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/${state.currentFeed.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Feed deleted successfully!');
            state.currentFeed = null;
            switchView('feeds');
            await loadFeeds();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete feed', 'error');
        }
    } catch (error) {
        console.error('Error deleting feed:', error);
        showToast('Error deleting feed', 'error');
    } finally {
        showLoading(false);
    }
}

// Refresh All Feeds
async function refreshAllFeeds() {
    showLoading(true);
    const promises = state.feeds.map(feed =>
        fetch(`${API_BASE}/${feed.id}/refresh`, { method: 'POST' })
    );

    try {
        await Promise.all(promises);
        showToast('All feeds refreshed!');
        await loadFeeds();
    } catch (error) {
        console.error('Error refreshing feeds:', error);
        showToast('Some feeds failed to refresh', 'error');
    } finally {
        showLoading(false);
    }
}

// Switch View
function switchView(viewName) {
    Object.values(views).forEach(view => view.classList.remove('active'));
    views[viewName].classList.add('active');
    state.currentView = viewName;
}

// Show Loading
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

// Show Toast
function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.style.background = type === 'error' ? '#EF4444' : '#10B981';
    elements.toast.classList.add('active');

    setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

// Make functions globally accessible
window.switchView = switchView;
window.loadFeedDetail = loadFeedDetail;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
