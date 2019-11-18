import {render, x, h, useEffect, useState} from './o.mjs';

const MAX_NEWS_ON_PAGE = 1000;
const MAX_NEWS_PER_FEED = 500;
const CORS_PROXY = 'https://cors.zserge.com/?u=';

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

let feeds = DEFAULT_FEEDS;
try {
  let f = JSON.parse(localStorage.getItem('feeds-v1'));
  feeds = f;
} catch (ignore) {}

const saveFeeds = () => localStorage.setItem('feeds-v1', JSON.stringify(feeds));

async function fetchFeed(url) {
  const text = await fetch(CORS_PROXY + encodeURIComponent(url)).then(res =>
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

const listeners = [];
const useFeeds = () => {
  const refresh = () => listeners.forEach(ln => ln(feeds));
  // Refresh all feeds
  const sync = async () => {
    feeds = await Promise.all(feeds.map(f => syncFeed(f)));
    saveFeeds();
    refresh();
  };
  // Add new feed
  const addFeed = async url => {
    if (!feeds.some(f => f.url === url)) {
      feeds.push({url, entries: []});
    }
    saveFeeds();
    refresh();
  };
  // Remove feed
  const removeFeed = url => {
    feeds = feeds.filter(f => f.url !== url);
    saveFeeds();
    refresh();
  };
  // Get merged, sorted and filtered news items
  const filterNews = (url, query) => {
    // TODO: filter by query
    let n = []
      .concat(...feeds.filter(f => !url || f.url == url).map(f => f.entries))
      .sort((a, b) => {
        return b.age - a.age || b.timestamp - a.timestamp;
      });
    return n;
  };
  const ln = useState()[1];
  useEffect(() => {
    listeners.push(ln);
    return () => (listeners = listeners.filter(listener => listener !== ln));
  }, []);
  return {feeds, sync, filterNews, addFeed, removeFeed};
};

const NewsList = ({shown, urlFilter}) => {
  const {filterNews} = useFeeds();
  const [query, setQuery] = useState('');
  const simplifyLink = link => {
    const parts = link.replace(/^.*:\/\/(www\.)?/, '').split('/');
    return parts[0];
  };
  return x`
    <div className=${'news' + (shown ? '' : ' hidden')}>
      ${filterNews(urlFilter, query).map(
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

const Menu = ({shown, setURLFilter}) => {
  const {feeds, addFeed, removeFeed} = useFeeds();
  const simplifyLink = link => {
    const s = link.replace(/^.*:\/\/(www\.)?/, '');
    const maxLength = 32;
    if (s.length < maxLength) {
      return s;
    } else {
      return s.substring(0, maxLength / 2) + '…' + s.substring(s.length - maxLength/2);
    }
  };
              //<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  return x`
    <div className=${'menu' + (shown ? '' : ' hidden')}>
      <ul>
        ${feeds.map(
          f => x`
          <li>
            <a onclick=${() => setURLFilter(f.url)}>${simplifyLink(f.url)}</a>
            <a className="svg-icon svg-baseline" onclick=${() => {
              if (confirm(`Remove ${f.url}?`)) {
                removeFeed(f.url);
              }
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </a>
          </li>
        `,
      )}
      <br/>
        <li>
          <input type="text" placeholder="RSS feed"/>
          <a className="svg-icon svg-baseline">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </a>
        </li>
      </ul>
    </div>
  `;
};

const HamburgerButton = ({onclick, menuShown}) => {
  return x`
    <div className=${'svg-icon' +
      (menuShown ? '' : ' close')} onclick=${onclick}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="12" y2="15"></line>
      </svg>
    </div>
  `;
};

const BackButton = ({onclick}) => {
  return x`
    <div className="svg-icon" onclick=${onclick}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6M12 5l-7 7 7 7"/></svg>
    </div>
  `;
};

const App = () => {
  const {sync} = useFeeds();
  const [sidebarShown, setSidebarShown] = useState(false);
  const [urlFilter, setURLFilter] = useState(window.location.hash.substring(1));
  const toggleSidebar = () => setSidebarShown(!sidebarShown);
  useEffect(() => {
    window.location.hash = '#' + urlFilter;
  }, [urlFilter]);
  useEffect(async () => {
    await sync();
  });
  return x`
    <div className="app">
      <header>
        ${
          !sidebarShown && urlFilter
            ? x`<${BackButton} onclick=${() => setURLFilter('')} />`
            : x`<${HamburgerButton} onclick=${toggleSidebar} menuShown=${sidebarShown}/>`
        }
        <div className=${'nav-right' + (sidebarShown ? ' hidden' : '')}>
          <div className="search svg-icon svg-baseline">
            <input type="text" name="search" placeholder="Search..." />
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
      </header>
      <${Menu} shown=${sidebarShown} setURLFilter=${filter => {
    setURLFilter(filter);
    setSidebarShown(false);
  }}/>
      <${NewsList} shown=${!sidebarShown} urlFilter=${urlFilter} />
    </div>
  `;
};

window.onload = () => render(x`<${App} />`, document.body);
