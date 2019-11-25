import assert from 'assert';
import {fetchFeed} from './rss.js';
import fetch from "node-fetch";
import jsdom from 'jsdom';

if (!global.fetch) {
    global.fetch = fetch;
}
if (!global.DOMParser) {
  global.DOMParser = new jsdom.JSDOM().window.DOMParser;
}

async function testFetchFeed() {
  const testFeeds = [
    'https://news.ycombinator.com/showrss',
    'https://hnrss.org/frontpage',
    'https://reddit.com/r/programming.rss',
  ];
  for (const url of testFeeds) {
    const feed = await fetchFeed(url, url => url);
    assert(feed.length > 0, url);
  }
}

(async () => {
  await testFetchFeed();
})();
