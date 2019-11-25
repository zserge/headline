import {fetchFeed} from './rss.js';
import fetch from "node-fetch";
import jsdom from 'jsdom';

if (!global.fetch) {
    global.fetch = fetch;
}
if (!global.DOMParser) {
  global.DOMParser = new jsdom.JSDOM().window.DOMParser;
}

(async () => {
  console.log(await fetchFeed('https://cdm.link/feed'));
})();
