'use strict;'

const _ = require('lodash'),
      fs = require('fs'),
      HJSON = require('hjson');
const {ipcRenderer, ipcMain} = require('electron');

function load(filepath) {
  let str = '';
  try {
    str = fs.readFileSync(filepath, {encoding: 'utf8'}).toString();
    return HJSON.parse(str);
  } catch (e) {
    console.trace(e);
    return {};
  }
}

function add(l, key) {
  const filepath = __dirname + `/../locales/${l}.json`;
  const d = load(filepath);
  d[key] = key;
  fs.writeFileSync(filepath, JSON.stringify(d, null, 2));
}

function reload() {
  Object.keys(data).forEach((l) => {
    data[l] = load(__dirname + `/../locales/${l}.json`);
  });
}

const builtin = _.merge({},
  require(__dirname + '/../data/ship_name.js'),
  require(__dirname + '/../data/slotitem_name.js'));

let locale = 'ja';
const container = {};

const data = {
  'ja': {},
  'en': {},
};

reload();

if (ipcMain) {
  ipcMain.on('i18n.add', (event, data) => {
    const l = _.get(data, ['locale'], null);
    const key = _.get(data, ['key'], null);
    if (l == null || key == null) {
      return;
    }
    add(l, key);
    reload();
    event.sender.send('i18n.reload', {});
  });
} else {
  ipcRenderer.on('i18n.reload', (event, data) => {
    reload();
  });
}

container.__ = function(key) {
  if (key in builtin) {
    if (locale != 'ja') {
      return builtin[key];
    } else {
      return key;
    }
  } else {
    const result = _.get(data, [locale, key], null);
    if (result == null) {
      if (ipcRenderer) {
        ipcRenderer.send('i18n.add', {locale: locale, key: key});
      } else {
        add(locale, key);
      }
      return key;
    } else {
      return result;
    }
  }
};

container.setLocale = function(l) {
  if (l in data) {
    locale = l;
  }
};

container.getLocale = function() {
  return locale;
};

module.exports = container;
