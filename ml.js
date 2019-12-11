import {readdirSync, readFileSync} from 'fs';
import path from 'path';
import {parseFeed} from './rss.js';
import jsdom from 'jsdom';

if (!global.DOMParser) {
  global.DOMParser = new jsdom.JSDOM().window.DOMParser;
}

// prettier-ignore
const stopwords = ['me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
  'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'an', 'the',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'can', 'will', 'just', 'don', 'could', 'should', 'would', 'now', 'll',
  're', 've', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'mustn', 'needn',
  'shouldn', 'wasn', 'weren', 'won', 'wouldn'];

const words = s =>
  s
    .toLowerCase()
    .replace(/[!\"#$%&()*+-./:;<=>?@[\]^_`{|}~\n]/g, ' ')
    .replace(/'/g, '')
    .replace(/[0-9]/g, '')
    .split(/\s+/)
    .filter(w => stopwords.indexOf(w) === -1)
    .filter(w => w.length > 1);

// prettier-ignore
const stemmer = (token) => {
  const step2list = {
    ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize', bli: 'ble', alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous', ization: 'ize', ation: 'ate', ator: 'ate', alism: 'al', iveness: 'ive', fulness: 'ful', ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble', logi: 'log',
  };
  const step3list = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' };
  const c = '[^aeiou]';
  const v = '[aeiouy]';
  const C = `${c}[^aeiouy]*`;
  const V = `${v}[aeiou]*`;
  const mgr0 = `^(${C})?${V}${C}`;
  const meq1 = `^(${C})?${V}${C}(${V})?$`;
  const mgr1 = `^(${C})?${V}${C}${V}${C}`;
  const s_v = `^(${C})?${v}`;
  const re_mgr0 = new RegExp(mgr0);
  const re_mgr1 = new RegExp(mgr1);
  const re_meq1 = new RegExp(meq1);
  const re_s_v = new RegExp(s_v);
  const re_1a = /^(.+?)(ss|i)es$/;
  const re2_1a = /^(.+?)([^s])s$/;
  const re_1b = /^(.+?)eed$/;
  const re2_1b = /^(.+?)(ed|ing)$/;
  const re_1b_2 = /.$/;
  const re2_1b_2 = /(at|bl|iz)$/;
  const re3_1b_2 = new RegExp('([^aeiouylsz])\\1$');
  const re4_1b_2 = new RegExp(`^${C}${v}[^aeiouwxy]$`);
  const re_1c = /^(.+?[^aeiou])y$/;
  const re_2 = new RegExp(`^(.+?)(${Object.keys(step2list).join('|')})$`);
  const re_3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  const re_4 = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  const re2_4 = /^(.+?)(s|t)(ion)$/;
  const re_5 = /^(.+?)e$/;
  const re_5_1 = /ll$/;
  const re3_5 = new RegExp(`^${C}${v}[^aeiouwxy]$`);
  let w = token.toString(), stem, suffix, firstch, re, re2, re3, re4, fp;
  if (w.length < 3) {
    return w;
  }
  firstch = w.substr(0, 1);
  if (firstch === 'y') {
    w = firstch.toUpperCase() + w.substr(1);
  }
  re = re_1a;
  re2 = re2_1a;
  if (re.test(w)) {
    w = w.replace(re, '$1$2');
  } else if (re2.test(w)) {
    w = w.replace(re2, '$1$2');
  }
  re = re_1b;
  re2 = re2_1b;
  if (re.test(w)) {
    fp = re.exec(w);
    re = re_mgr0;
    if (re.test(fp[1])) {
      re = re_1b_2;
      w = w.replace(re, '');
    }
  } else if (re2.test(w)) {
    fp = re2.exec(w);
    stem = fp[1];
    re2 = re_s_v;
    if (re2.test(stem)) {
      w = stem;
      re2 = re2_1b_2;
      re3 = re3_1b_2;
      re4 = re4_1b_2;
      if (re2.test(w)) {
        w = `${w}e`;
      } else if (re3.test(w)) {
        re = re_1b_2;
        w = w.replace(re, '');
      } else if (re4.test(w)) {
        w = `${w}e`;
      }
    }
  }
  re = re_1c;
  if (re.test(w)) {
    fp = re.exec(w);
    stem = fp[1];
    w = `${stem}i`;
  }
  re = re_2;
  if (re.test(w)) {
    fp = re.exec(w);
    stem = fp[1];
    suffix = fp[2];
    re = re_mgr0;
    if (re.test(stem)) {
      w = stem + step2list[suffix];
    }
  }
  re = re_3;
  if (re.test(w)) {
    fp = re.exec(w);
    stem = fp[1];
    suffix = fp[2];
    re = re_mgr0;
    if (re.test(stem)) {
      w = stem + step3list[suffix];
    }
  }
  re = re_4;
  re2 = re2_4;
  if (re.test(w)) {
    fp = re.exec(w);
    stem = fp[1];
    re = re_mgr1;
    if (re.test(stem)) {
      w = stem;
    }
  } else if (re2.test(w)) {
    fp = re2.exec(w);
    stem = fp[1] + fp[2];
    re2 = re_mgr1;
    if (re2.test(stem)) {
      w = stem;
    }
  }
  re = re_5;
  if (re.test(w)) {
    fp = re.exec(w);
    stem = fp[1];
    re = re_mgr1;
    re2 = re_meq1;
    re3 = re3_5;
    if (re.test(stem) || (re2.test(stem) && !re3.test(stem))) {
      w = stem;
    }
  }
  re = re_5_1;
  re2 = re_mgr1;
  if (re.test(w) && re2.test(w)) {
    re = re_1b_2;
    w = w.replace(re, '');
  }
  if (firstch === 'y') {
    w = firstch.toLowerCase() + w.substr(1);
  }
  return w;
}

const files = readdirSync('testdata');
const news = files
  .map(f => parseFeed(readFileSync(path.join('testdata', f)).toString()))
  .reduce((a, n) => {
    a = a.concat(n);
    return a;
  }, []);

class Document {
  constructor(s) {
    this.s = s;
    this.tf = {};
    words(s).map(w => w).forEach(term => this.tf[term] = (this.tf[term]|0) + 1);
  }
}

class Corpus {
  constructor() {
    this.docs = [];
    this.df = {};
    this.likes = new Document('');
  }
  add(s) {
    const doc = new Document(s);
    this.docs.push(doc);
    for (let term in doc.tf) {
      this.df[term] = (this.df[term]|0) + 1;
    }
  }
  like(s) {
    this.likes = new Document(this.likes.s + ' ' + s);
  }
  vectorize(doc) {
    const tfidf = {};
    const size = Object.keys(this.df).length;
    const docsize = Object.keys(doc.tf).length;
    if (docsize == 0) {
      return {};
    }
    for (let term in doc.tf) {
      tfidf[term] = doc.tf[term] / docsize * Math.log(size/(this.df[term]));
    }
    return tfidf;
  }
  rate(doc) {
    return this.similarity(doc, this.likes);
  }
  similarity(a, b) {
    const v1 = this.vectorize(a);
    const v2 = this.vectorize(b);
    const keys = new Set(Object.keys(v1));
    for (let k in v2) {
      keys.add(k);
    }
    let dotProduct = 0.0;
    let ss1 = 0.0;
    let ss2 = 0.0;
    keys.forEach(k => {
      if (v1[k] && v2[k]) {
        dotProduct += v1[k] * v2[k];
        ss1 += v1[k] * v1[k];
        ss2 += v2[k] * v2[k];
      }
    });
    const magnitude = Math.sqrt(ss1) * Math.sqrt(ss2);
    return magnitude ? dotProduct / magnitude : 0.0;
  }
}

const corpus = new Corpus();
console.log('LIKE:');
let likes = 0;
news.forEach(n => {
  corpus.add(n.title);
  if (Math.random() < 0.1 && likes < 5) {
    corpus.like(n.title);
    console.log(n.title);
    likes++;
  }
});
console.log('=================');
corpus.docs.forEach(doc => {
  let r = corpus.rate(doc);
  if (r > 0) {
    console.log(doc.s, r);
  }
});
