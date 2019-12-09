import {readdirSync, readFileSync} from 'fs';
import path from 'path';
import {parseFeed} from './rss.js';
import jsdom from 'jsdom';

if (!global.DOMParser) {
  global.DOMParser = new jsdom.JSDOM().window.DOMParser;
}

const symbols = /[!\"#$%&()*+-./:;<=>?@[\]^_`{|}~\n]/g;
const stopwords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves",
"you", "your", "yours", "yourself", "yourselves", "he", "him", "his",
"himself", "she", "her", "hers", "herself", "it", "its", "itself", "they",
"them", "their", "theirs", "themselves", "what", "which", "who", "whom",
"this", "that", "these", "those", "am", "is", "are", "was", "were", "be",
"been", "being", "have", "has", "had", "having", "do", "does", "did", "doing",
"a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while",
"of", "at", "by", "for", "with", "about", "against", "between", "into",
"through", "during", "before", "after", "above", "below", "to", "from", "up",
"down", "in", "out", "on", "off", "over", "under", "again", "further", "then",
"once", "here", "there", "when", "where", "why", "how", "all", "any", "both",
"each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
"only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will",
"just", "don", "should", "now"];

const words = s => s.toLowerCase()
  .replace(symbols, ' ').replace(/'/g, '')
  .split(/\s+/)
  .filter(w => stopwords.indexOf(w) === -1)
  .filter(w => w.length > 1);

const stemmer = (function () {
  var step2list = {
    'ational': 'ate',
    'tional': 'tion',
    'enci': 'ence',
    'anci': 'ance',
    'izer': 'ize',
    'bli': 'ble',
    'alli': 'al',
    'entli': 'ent',
    'eli': 'e',
    'ousli': 'ous',
    'ization': 'ize',
    'ation': 'ate',
    'ator': 'ate',
    'alism': 'al',
    'iveness': 'ive',
    'fulness': 'ful',
    'ousness': 'ous',
    'aliti': 'al',
    'iviti': 'ive',
    'biliti': 'ble',
    'logi': 'log'
  },

    step3list = {
      'icate': 'ic',
      'ative': '',
      'alize': 'al',
      'iciti': 'ic',
      'ical': 'ic',
      'ful': '',
      'ness': ''
    },

    c = '[^aeiou]', // consonant
    v = '[aeiouy]', // vowel
    C = c + '[^aeiouy]*', // consonant sequence
    V = v + '[aeiou]*', // vowel sequence

    mgr0 = '^(' + C + ')?' + V + C, // [C]VC... is m>0
    meq1 = '^(' + C + ')?' + V + C + '(' + V + ')?$', // [C]VC[V] is m=1
    mgr1 = '^(' + C + ')?' + V + C + V + C, // [C]VCVC... is m>1
    s_v = '^(' + C + ')?' + v; // vowel in stem

  var re_mgr0 = new RegExp(mgr0);
  var re_mgr1 = new RegExp(mgr1);
  var re_meq1 = new RegExp(meq1);
  var re_s_v = new RegExp(s_v);

  var re_1a = /^(.+?)(ss|i)es$/;
  var re2_1a = /^(.+?)([^s])s$/;
  var re_1b = /^(.+?)eed$/;
  var re2_1b = /^(.+?)(ed|ing)$/;
  var re_1b_2 = /.$/;
  var re2_1b_2 = /(at|bl|iz)$/;
  var re3_1b_2 = new RegExp('([^aeiouylsz])\\1$');
  var re4_1b_2 = new RegExp('^' + C + v + '[^aeiouwxy]$');

  var re_1c = /^(.+?[^aeiou])y$/;
  var re_2 = new RegExp('^(.+?)(' + Object.keys(step2list).join('|') + ')$');

  var re_3 = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;

  var re_4 = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  var re2_4 = /^(.+?)(s|t)(ion)$/;

  var re_5 = /^(.+?)e$/;
  var re_5_1 = /ll$/;
  var re3_5 = new RegExp('^' + C + v + '[^aeiouwxy]$');

  var porterStemmer = function porterStemmer(token) {
    var w = token.toString();
    var stem,
      suffix,
      firstch,
      re,
      re2,
      re3,
      re4,
      fp;

    if (w.length < 3) { return w; }

    firstch = w.substr(0, 1);
    if (firstch === 'y') {
      w = firstch.toUpperCase() + w.substr(1);
    }

    // Step 1a
    re = re_1a;
    re2 = re2_1a;

    if (re.test(w)) {
      w = w.replace(re, '$1$2');
    } else if (re2.test(w)) {
      w = w.replace(re2, '$1$2');
    }

    // Step 1b
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
          w = w + 'e';
        } else if (re3.test(w)) {
          re = re_1b_2;
          w = w.replace(re, '');
        } else if (re4.test(w)) {
          w = w + 'e';
        }
      }
    }

    // Step 1c - replace suffix y or Y by i if preceded by a non-vowel which is
    // not the first letter of the word (so cry -> cri, by -> by, say -> say)
    re = re_1c;
    if (re.test(w)) {
      fp = re.exec(w);

      stem = fp[1];
      w = stem + 'i';
    }

    // Step 2
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

    // Step 3
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

    // Step 4
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

    // Step 5
    re = re_5;
    if (re.test(w)) {
      fp = re.exec(w);

      stem = fp[1];
      re = re_mgr1;
      re2 = re_meq1;
      re3 = re3_5;
      if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
        w = stem;
      }
    }

    re = re_5_1;
    re2 = re_mgr1;
    if (re.test(w) && re2.test(w)) {
      re = re_1b_2;
      w = w.replace(re, '');
    }

    // and turn initial Y back to y

    if (firstch === 'y') {
      w = firstch.toLowerCase() + w.substr(1);
    }

    return w;
  };

  return porterStemmer;
})();

const files = readdirSync('testdata');
const news = files.map(f => {
  const text = readFileSync(path.join('testdata',  f)).toString();
  return parseFeed(text);
}).reduce((a, n) => {
  a = a.concat(n);
  return a
}, []).map(n => words(n.title).map(w => stemmer(w)));

console.log(news);
