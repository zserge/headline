const DEFAULT_CORS_PROXY = url => `https://cors.zserge.com/?u=${encodeURIComponent(url)}`;

const DEFAULT_FEEDS = [
  'https://news.google.com/rss',
  'https://www.reddit.com/r/programming.rss',
  'https://www.reddit.com/r/golang.rss',
  'https://www.reddit.com/r/todayilearned.rss',
];

const MAX_NEWS_PER_FEED = 500;
const MAX_NEWS_ON_PAGE = 1000;

const loading = document.querySelector('#loading');
const menu = document.querySelector('#menu');
const title = document.querySelector('#title');
const settings = document.querySelector('#settings');
const keywords = document.querySelector('#settings textarea');
const news = document.querySelector('#news');
const newsFeeds = document.querySelector('#feeds');

const feedItem = document.querySelector('#settings-feed-item');
const newsItem = document.querySelector('#news-item');

// State = {lastSeen: Date, feeds: Array<Feed>}
// Feed = {url: String, Entries: Array<Entry>}
// Entry = {title: String, link: String, timestamp: Date}
const state = (() => {
  try {
    // Restore from local storage
    let state = JSON.parse(localStorage.getItem('state-v1'));
    // Parse timestamps from JSON
    state.feeds.forEach(feed => {
      feed.entries.forEach(e => {
        e.timestamp = new Date(e.timestamp);
      });
    });
    return state;
  } catch (e) {
    // Try importing settings from the URL
    try {
      const settings = JSON.parse(atob(window.location.hash.substring(1)));
      return {
        feeds: settings.feeds.map(url => ({url, entries: []})),
        keywords: settings.keywords,
      };
    } catch (e) {
      // If anything goes wrong - use default values
      return {
        feeds: DEFAULT_FEEDS.map(url => ({url, entries: []})),
        keywords: '',
      };
    }
  }
})();

function save() {
  localStorage.setItem('state-v1', JSON.stringify(state));
  const settings = {
    feeds: state.feeds.map(f => f.url),
    keywords: state.keywords,
  };
  window.location.hash = btoa(JSON.stringify(settings));
}

let urlFilter = '';

// parseFeed converts RSS or Atom text into a list of feed entries
function parseFeed(text) {
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const map = (c, f) => Array.prototype.slice.call(c, 0).map(f);
  const tag = (item, name) =>
    (item.getElementsByTagName(name)[0] || {}).textContent;
  switch (xml.documentElement.nodeName) {
    case 'rss':
      return map(xml.documentElement.getElementsByTagName('item'), item => ({
        link: tag(item, 'link'),
        title: tag(item, 'title'),
        timestamp: new Date(tag(item, 'pubDate')),
      }));
    case 'feed':
      return map(xml.documentElement.getElementsByTagName('entry'), item => ({
        link: map(item.getElementsByTagName('link'), link => {
          const rel = link.getAttribute('rel');
          if (!rel || rel === 'alternate') {
            return link.getAttribute('href');
          }
        })[0],
        title: tag(item, 'title'),
        timestamp: new Date(tag(item, 'updated')),
      }));
  }
  return [];
}

const simplifyLink = link => link.replace(/^.*:\/\/(www\.)?/, '');

function renderSettings() {
  keywords.value = state.keywords;
  newsFeeds.innerHTML = '';
  state.feeds.forEach(f => {
    const el = document.importNode(feedItem.content, true).querySelector('li');
    el.querySelector('span').innerText = simplifyLink(f.url);
    el.querySelector('a').onclick = () => {
      urlFilter = f.url;
      menu.classList.remove('close');
      menu.classList.add('back');
      settings.classList.remove('shown');
      title.innerText = simplifyLink(f.url);
      render(urlFilter);
    };
    el.querySelectorAll('a')[1].onclick = () => {
      if (confirm(`Remove ${f.url}?`)) {
        state.feeds = state.feeds.filter(x => x.url !== f.url);
        save();
        window.location.reload();
      }
    };
    newsFeeds.appendChild(el);
  });
}

function render(urlFilter = '') {
  const marks = state.keywords.split(',').map(k => k.trim()).filter(k => k.length).map(k => {
    let mode = '';
    if (k[0] == "/" && k[k.length - 1] == '/') {
      k = k.substring(1, k.length - 1);
    } else {
      k = '\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b';
      mode = (k.toLowerCase() == k ? 'i' : '');
    }
    return new RegExp(k, mode);
  });
  const highlight = s => marks.some(m => m.exec(s));
  const newsList = [].concat(...state.feeds.filter(f => !urlFilter || f.url == urlFilter).map(f => f.entries))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NEWS_ON_PAGE);

  news.innerHTML = '';
  newsList.forEach((n, i) => {
    // Get or create a new item
    let el = news.childNodes[i];
    if (!el) {
      el = document.importNode(newsItem.content, true).querySelector('li');
      news.appendChild(el);
    }

    // If the day has changed between the two adjacent items - show new date delimiter
    const day = i ? newsList[i - 1].timestamp.toDateString() : '';
    if (n.timestamp.toDateString() !== day) {
      el.querySelector('h3').innerText =
        n.timestamp.toLocaleDateString(undefined, { month: 'long', day: '2-digit' });
    } else {
      el.querySelector('h3').innerText = '';
    }

    el.querySelector('a').href = n.link;
    el.querySelector('span').innerHTML = n.title;
    if (highlight(n.title)) {
      el.querySelector('span').classList.add('marked');
    } else {
      el.querySelector('span').classList.remove('marked');
    }
    el.querySelector('em').innerText = `(${simplifyLink(n.link).split('/')[0]})`;
  });
}

function onMenuClicked() {
  if (menu.classList.contains('close')) {
    title.innerText = '';
    menu.classList.remove('close');
    settings.classList.remove('shown');
  } else if (menu.classList.contains('back')) {
    title.innerText = '';
    urlFilter = '';
    menu.classList.remove('back');
    render(urlFilter);
  } else {
    title.innerText = 'Settings';
    menu.classList.add('close');
    settings.classList.add('shown');
  }
}

function onDoneClicked() {
  onMenuClicked();
  render(urlFilter);
}

function onAddFeedClicked() {
  const url = prompt(`Enter feed URL:`);
  if (url) {
    if (!state.feeds.some(f => f.url === url)) {
      state.feeds.push({url, entries: []});
      save();
      window.location.reload();
    }
  }
}

function onKeywordsChanged(keywords) {
  state.keywords = keywords;
  save();
}

(async () => {
  // Register service worker for PWA
  navigator.serviceWorker.register('sw.js');
  // Render cached news
  save();
  renderSettings();
  render(urlFilter);
  // Fetch each feed and render the settings screen
  for (const feed of state.feeds) {
    const f = parseFeed(await fetch(DEFAULT_CORS_PROXY(feed.url)).then(res => res.text()));
    feed.entries = feed.entries
      .concat(
        f.filter(e => feed.entries.findIndex(x => (x.link === e.link || x.title === e.title)) < 0),
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_NEWS_PER_FEED);
    localStorage.setItem('state-v1', JSON.stringify(state));
  }
  
  // Hide loading indicator
  loading.classList.add('hidden');
  render(urlFilter);
})();
