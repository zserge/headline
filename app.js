import {render, x, useEffect, useState} from './o.mjs';
import {Feeds} from './rss.js';

const feeds = new Feeds();

console.log('app loaded');

let listeners = [];
let isLoading = false;
const useFeeds = () => {
  const refresh = () => listeners.forEach(ln => ln(feeds));
  // Refresh all feeds
  const sync = async () => {
    isLoading = true;
    requestAnimationFrame(refresh);
    await feeds.sync();
    feeds.save();
    isLoading = false;
    refresh();
  };
  // Add new feed
  const addFeed = url => {
    feeds.add(url);
    feeds.save();
    sync();
  };
  // Remove feed
  const removeFeed = url => {
    feeds.remove(url);
    feeds.save();
    refresh();
  };
  // Get merged, sorted and filtered news items
  const filterNews = url => feeds.items(url);
  const ln = useState()[1];
  useEffect(() => {
    listeners.push(ln);
    return () => (listeners = listeners.filter(listener => listener !== ln));
  }, []);
  return {feeds: feeds.feeds, loading: isLoading, sync, filterNews, addFeed, removeFeed};
};

const NewsList = ({shown, urlFilter}) => {
  const {filterNews} = useFeeds();
  const simplifyLink = link => {
    const parts = link.replace(/^.*:\/\/(www\.)?/, '').split('/');
    return parts[0];
  };
  return x`
    <div className=${'screen news' + (shown ? '' : ' hidden')}>
      ${filterNews(urlFilter).reduce((list, n) => {
        let day = (list.length ? list[list.length - 1].timestamp.toDateString() : '');
        if (n.timestamp.toDateString() !== day) {
          list.push({timestamp: n.timestamp});
        }
        list.push(n);
        return list;
      }, []).map(
        n => x`
          <p>
            ${
              (!n.link)
                ? x`<h3 className="day-break">${n.timestamp.toLocaleDateString(undefined, {
                  month: 'long', day: '2-digit',
                })}</h3>`
                : x`<a href=${n.link}>
                    <span className="title">${n.title}</span>
                    ${' '}
                    <em className="link">(${simplifyLink(n.link)})</em>
                  </a>`
            }
          </p>
        `,
      )}
    </div>
  `;
};

const Menu = ({shown, setURLFilter}) => {
  const {feeds, addFeed, removeFeed} = useFeeds();
  const [feedName, setFeedName] = useState('');
  const simplifyLink = link => {
    const s = link.replace(/^.*:\/\/(www\.)?/, '');
    const maxLength = 32;
    if (s.length < maxLength) {
      return s;
    } else {
      return s.substring(0, maxLength / 2) + '…' + s.substring(s.length - maxLength/2);
    }
  };
  const submitForm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (feedName) {
      addFeed(feedName);
      setFeedName('');
    }
  };
  return x`
    <div className=${'screen menu' + (shown ? '' : ' hidden')}>
      <ul>
        <h3>Your feeds:</h3>
        ${feeds.map(
          f => x`
          <li>
            <a onclick=${() => setURLFilter(f.url)}><span className="title">${simplifyLink(f.url)}</span></a>
            <a className="svg-icon svg-icon-right svg-baseline" onclick=${() => {
              if (confirm(`Remove ${f.url}?`)) {
                removeFeed(f.url);
              }
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </a>
          </li>
        `,
      )}
      <br/>
        <li>
          <form style="width: 100%;" onsubmit=${submitForm}>
            <input type="text" placeholder="RSS feed" value=${feedName} oninput=${e => setFeedName(e.target.value)} />
            <a className="svg-icon svg-icon-right svg-baseline" onclick=${submitForm}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </a>
          </form>
        </li>
      </ul>
    </div>
  `;
};

const MenuButton = ({onclick, className}) => {
  return x`
    <div
      className=${'svg-icon menu-icon ' + className}
      onclick=${onclick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="var(--text-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-6,12 L0,6 L24,6 L12,18" />
        <path d="M-6,12 L0,18 L24,18 L12,6" />
        <path d="M3,12 L21,12" />
      </svg>
    </div>
  `;
};

const App = () => {
  const {sync, loading} = useFeeds();
  const [sidebarShown, setSidebarShown] = useState(false);
  const [urlFilter, setURLFilter] = useState(window.location.hash.substring(1));
  const toggleSidebar = () => setSidebarShown(!sidebarShown);
  const chooseOneFeed = (feedURL) => {
    setURLFilter(feedURL);
    setSidebarShown(false);
  };
  console.log('app rendering');
  useEffect(() => {
    console.log('before hash changed');
    window.location.hash = '#' + urlFilter;
    console.log('after hash changed');
    document.title = `Headline - ${urlFilter || 'minimalist news reader'}`
  }, [urlFilter]);
  useEffect(async () => {
    await sync();
  });
  return x`
    <div className="app">
      <div className=${'progress' + (loading ? '' : ' hidden')}>
        <div className="indeterminate" />
      </div>
      <nav>
        <${MenuButton}
          className=${urlFilter ? 'back' : sidebarShown ? 'close' : 'burger'}
          onclick=${urlFilter ? () => chooseOneFeed('') : toggleSidebar}
        />
      </nav>
      <${Menu} shown=${sidebarShown} setURLFilter=${chooseOneFeed} />
      <${NewsList} shown=${!sidebarShown} urlFilter=${urlFilter} />
    </div>
  `;
};

window.onload = () => render(x`<${App} />`, document.body);
