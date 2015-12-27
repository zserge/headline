var MAX_NEWS_ON_PAGE = 1000
var MAX_NEWS_PER_FEED = 500

var CORS_PROXY = 'http://cors.dokku.trikita.co/';

function map(c, f) {
	return Array.prototype.slice.call(c, 0).map(f);
}

function tag(item, name) {
	var tags = item.getElementsByTagName(name);
	return (tags && tags.length > 0) ? tags[0].textContent : undefined;
}

function rss20(rss) {
	return map(rss.documentElement.getElementsByTagName('item'), function(item) {
		return {
			link: tag(item, 'link'),
			title: tag(item, 'title'),
			text: tag(item, 'description'),
			timestamp: new Date(tag(item, 'pubDate')),
			age: 0,
		};
	});
}

function atom(rss) {
	return map(rss.documentElement.getElementsByTagName('entry'), function(item) {
		return {
			links: map(item.getElementsByTagName('link'), function(link) {
				if (link.getAttribute('rel') === 'alternate') {
					return link.getAttribute('href');
				}
			}),
			title: tag(item, 'title'),
			text: tag(item, 'content'),
			timestamp: new Date(tag(item, 'updated')),
			age: 0,
		};
	});
}

function rss(s) {
	var root = new DOMParser().parseFromString(s, 'text/xml');
	var rootNode = root.documentElement.nodeName;
	if (rootNode == 'rss') {
		return rss20(root);
	} else if (rootNode == 'feed') {
		return atom(root);
	}
}

function merge(a, b) {
	for (var i = b.length-1; i >= 0; i--) {
		var ok = true;
		for (var j = 0; j < a.length; j++) {
			if (a[j].link === b[i].link) {
				ok = false;
				break;
			}
		}
		if (ok) {
			a.unshift(b[i]);
		}
	}
	a = a.slice(0, MAX_NEWS_PER_FEED)
	return a;
}

function feed(url, storage) {
	var f = {
		id: url,
		url: url,
		news: JSON.parse(storage.getItem('news:' + url) || '[]'),
		sync: function() {
			f.news.forEach(function(n) { n.age++; });
			m.request({
				url: f.url,
				deserialize: rss,
			}).then(function(items) {
				f.news = merge(f.news, items);
				storage.setItem('news:' + url, JSON.stringify(f.news));
			}, function(err) {
				if (f.url.indexOf(CORS_PROXY) != 0) {
					f.url = CORS_PROXY + url;
					f.sync();
				}
			});
			return f;
		},
	};
	return f;
}

var Nav = {
	controller: function(parent) {
		return {
			ondelete: function(id) {
				if (!confirm('Delete feed ' + id + '?')) {
					return;
				}
				parent.remove(id);
			}
		}
	},
	view: function(c, parent) {
		return m('nav.nav',
			m('ul',
				parent.feeds.map(function(feed) {
					return m('li',
						m('p', feed.id,
							m('span.delete', {
								onclick: c.ondelete.bind(c, feed.id),
							}, m.trust('&nbsp;[x]'))));
				})));
	}
};

var News = {
	view: function(c, news) {
		return m('section.news',
		 news.length == 0 ?  m('p', 'No news here') :
			m('ul',
				news.map(function(n) {
					return m('li',
						m('a[href='+n.link+']', n.title));
				})));
	}
};

var App = {
	controller: function() {
		var feeds = [
			'https://news.ycombinator.com/rss',
			'http://zserge.com/rss.xml',
			'https://www.reddit.com/r/programming.rss',
			'https://www.reddit.com/r/worldnews.rss',
			'https://www.reddit.com/r/lua.rss',
			'https://www.reddit.com/r/golang.rss',
			'https://www.reddit.com/r/china.rss',
			'https://www.reddit.com/r/shanghai.rss',
			'https://www.reddit.com/r/ukraina.rss',
		];
		if (localStorage.getItem('feeds')) {
			feeds = JSON.parse(localStorage.getItem('feeds'));
		}
		if (m.route.param('url')) {
			if (feeds.indexOf(m.route.param('url')) == -1) {
				feeds.push(m.route.param('url'));
			}
		}
		localStorage.setItem('feeds', JSON.stringify(feeds));

		var c = {
			onunload: function() {
				clearTimeout(c.tid);
			},
			remove: function(id) {
				c.feeds = c.feeds.filter(function(f) { return f.id != id;});
				localStorage.setItem('feeds', JSON.stringify(c.feeds.map(function(f) {
					return f.id;
				})));
			},
			feeds: feeds.map(function(url) { return feed(url, localStorage);}),
			newsfeed: function() {
				var list = [];
				c.feeds.forEach(function(feed) {
					feed.news.forEach(function(n) {
						if (list.length < MAX_NEWS_ON_PAGE) {
							list.push(n);
						}
					});
				});
				return list.sort(function(a, b) {
					if (a.age < b.age) {
						return -1;
					} else if (a.age > b.age) {
						return 1;
					} else if (a.timestamp < b.timestamp) {
						return 1;
					} else if (a.timestamp > b.timestamp) {
						return -1;
					} else {
						return 0;
					}
				});
			},
		};

		function sync() {
			c.feeds.forEach(function(feed) {
				feed.sync();
			});
		}

		// Sync now and every 5 minutes
		setTimeout(sync, 100);
		c.tid = setInterval(sync, 5 * 60 * 1000);
		return c;
	},
	view: function(c) {
		return m('.layout',
			m.component(Nav, c),
			m.component(News, c.newsfeed()));
	}
};

window.onload = function() {
	m.route.mode = 'hash';
	m.route(document.body, '/', {
		'/:url...': App,
	});
}
