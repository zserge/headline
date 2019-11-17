import {render, x, h, useEffect, useState} from './o.mjs';

const MAX_NEWS_ON_PAGE = 1000;
const MAX_NEWS_PER_FEED = 500;
const CORS_PROXY = 'https://cors.zserge.com/?u=';

let feeds = [
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

async function fetchFeed(url) {
  const text = await fetch(CORS_PROXY + encodeURIComponent(url)).then(res =>
    res.text(),
  );
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const map = (c, f) => Array.prototype.slice.call(c, 0).map(f);
  const tag = (item, name) =>
    (item.getElementsByTagName(name)[0] || {}).textContent;
  const plainText = html => {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent || el.innerText || '';
  };
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
}

async function syncFeed(feed) {
  const entries = await fetchFeed(feed.url);
  const mergedEntries = feed.entries
    .concat(
      entries.filter(e => feed.entries.findIndex(x => x.link === e.link) < 0),
    )
    .slice(0, MAX_NEWS_PER_FEED);
  return {url: feed.url, entries: mergedEntries};
}

async function syncAllFeeds() {
  const res = await Promise.all(feeds.map(f => syncFeed(f)));
  const news = Array.prototype.concat
    .apply([], res.map(f => f.entries))
    .sort((a, b) => {
      return b.age - a.age || b.timestamp - a.timestamp;
    });
  return news;
}

const NewsList = () => {
  const [news, setNews] = useState([]);
  const simplifyLink = link => {
    const parts = link.replace(/^.*:\/\/(www\.)?/, '').split('/');
    return parts[0];
  };
  useEffect(async () => {
    const news = await syncAllFeeds();
    setNews(news.slice(0, MAX_NEWS_ON_PAGE));
  });
  return x`
  <div class="news">
    ${news.map(
      n => x`
        <p>
          <a href=${n.link}>
            ${n.title + ' '}
            <em>(${simplifyLink(n.link)})</em>
          </a>
        </p>
      `,
    )}
  </div>
  `;
};

const SidebarToggleButton = ({onclick}) => x`
  <div onclick=${onclick}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="3" y1="15" x2="12" y2="15"></line>
    </svg>
  </div>
`;

const Sidebar = () => {
  return x`
    <div>
    ${feeds.map(f => x`<p><a href=${'#' + f.url}>${f.url}</a></p>`)}
    </div>
  `;
};

const App = () => {
  const [sidebarShown, setSidebarShown] = useState(false);
  return x`
    <div>
      <header style="display: flex; margin: 1rem 0;">
        <${SidebarToggleButton} onclick=${() => setSidebarShown(!sidebarShown)} />
        <div style="margin-left: auto">
          <div className="search">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" name="search" placeholder="Search..." />
          </div>
        </div>
      </header>
      <${Sidebar} shown=${sidebarShown}/>
      <${NewsList} shown=${!sidebarShown} />
    </div>
  `;
};

window.onload = () => render(x`<${App} />`, document.body);
