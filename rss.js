const MAX_NEWS_PER_FEED = 500;
const MAX_NEWS_ON_PAGE = 1000;

const DEFAULT_CORS_PROXY = url => `https://cors.zserge.com/?u=${encodeURIComponent(url)}`;

const DEFAULT_FEEDS = [
  {
    url: 'https://news.google.com/rss',
    entries: [],
  },
  {
    url: 'https://www.reddit.com/r/programming.rss',
    entries: [],
  },
  {
    url: 'https://www.reddit.com/r/golang.rss',
    entries: [],
  },
  {
    url: 'https://www.reddit.com/r/lua.rss',
    entries: [],
  },
];

export class Feeds {
  constructor() {
    this.feeds = DEFAULT_FEEDS;
    this.load();
  }

  load() {
    try {
      let savedFeeds = JSON.parse(localStorage.getItem('feeds-v1'));
      savedFeeds.forEach(feed => {
        feed.entries.forEach(e => {
          e.timestamp = new Date(e.timestamp);
        });
      });
      this.feeds = savedFeeds;
    } catch (e) { /* ignore */ }
  }

  save() {
    localStorage.setItem('feeds-v1', JSON.stringify(this.feeds));
  }

  async sync() {
    for (const feed of this.feeds) {
      const f = await syncFeed(feed);
      feed.entries = f.entries;
    }
    //this.feeds = await Promise.all(this.feeds.map(f => syncFeed(f)));
  }

  add(url) {
    if (!this.feeds.some(f => f.url === url)) {
      this.feeds.push({url, entries: []});
    }
  }

  remove(url) {
    this.feeds = this.feeds.filter(f => f.url !== url);
  }

  items(url = '', limit = MAX_NEWS_ON_PAGE) {
    let n = []
      .concat(...this.feeds.filter(f => !url || f.url == url).map(f => f.entries))
      .sort((a, b) => {
        return b.timestamp - a.timestamp;
      }).slice(0, limit);
    return n;
  }
}

export async function fetchFeed(url, proxy = DEFAULT_CORS_PROXY) {
  const text = await fetch(proxy(url)).then(res =>
    res.text(),
  );
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

export async function syncFeed(feed) {
  const entries = await fetchFeed(feed.url);
  const mergedEntries = feed.entries
    .concat(
      entries.filter(e => feed.entries.findIndex(x => (x.link === e.link || x.title === e.title)) < 0),
    )
    .slice(0, MAX_NEWS_PER_FEED);
  return {url: feed.url, entries: mergedEntries};
}
