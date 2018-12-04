'use strict;'

const _ = require('lodash'),
      fs = require('fs');

const Rat = require(__dirname + '/Rat.js');

const keys = {
  'scale': 'rat',
  'mainWindow.bounds': 'bounds',
  'shipWindow.bounds': 'bounds',
  'shipWindowVisible': 'bool',
  'shipWindowSort': 'any',
  'shipWindowFilter': 'any',
  'mute': 'bool',
  'sqlPresetList': 'any',
  'language': 'string',
  'shipWindowColumnWidth': 'any',
  'shipWindow.ColumnVisibility': 'any',
};

const VERSION = 1;

const sanitizer_mapping = {
  'rat': function(value) {
    if (typeof(value) != 'string') {
      return null;
    }
    const r = Rat.fromString(value);
    if (!r) {
      return null;
    }
    return value;
  },
  'bounds': function(value) {
    const x = _.get(value, ['x'], null);
    const y = _.get(value, ['y'], null);
    const width = _.get(value, ['width'], null);
    const height = _.get(value, ['height'], null);
    if (typeof(x) != 'number' || typeof(y) != 'number' || typeof(width) != 'number' || typeof(height) != 'number') {
      return {};
    }
    if (width <= 0 || height <= 0) {
      return {};
    }
    return {x: x, y: y, width: width, height: height};
  },
  'bool': function(value) {
    if (typeof(value) != 'boolean') {
      return null;
    }
    return value;
  },
  'any': function(value) {
    return value;
  },
  'string': function(value) {
    if (typeof(value) != 'string') {
      return null;
    }
    return value;
  },
};

function migrate(data) {
  const version = _.get(data, ['version'], 0);
  if (version > VERSION) {
    return {};
  }
  switch (version) {
    case 0:
      let presetList = _.get(data, ['sqlPresetList'], {});
      const ids = Object.keys(presetList);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        let preset = presetList[id];
        let sql = _.get(preset, ['sql'], null);
        if (sql == null) {
          continue;
        }
        preset['sql'] = sql.replace(/repair_seconds/g, 'repair_milliseconds');
        presetList[id] = preset;
      }
      data['version'] = VERSION;
      return data;
    case 1:
      return data;
    default:
      return {};
  }
}

class Config {
  constructor(data) {
    this._data = {};
    this.patch(migrate(data));
  }

  patch(data, callback) {
    for (var key in keys) {
      const type = keys[key];
      const sanitizer = sanitizer_mapping[type];
      if (!sanitizer) {
        console.trace('sanitizer not specified: type=' + type);
        continue;
      }
      const value = _.get(data, [key], null);
      if (value == null) {
        continue;
      }
      const sanitized = sanitizer(value);
      if (sanitized != null) {
        this._data[key] = value;
      }
    }
    if (callback) {
      callback(this);
    }
  }

  scale() {
    return _.get(this._data, ['scale'], '1200/1200');
  }

  mainWindowBounds() {
    const bounds = _.get(this._data, ['mainWindow.bounds'], null);
    return sanitizer_mapping['bounds'](bounds);
  }

  shipWindowBounds() {
    const bounds = _.get(this._data, ['shipWindow.bounds'], null);
    return sanitizer_mapping['bounds'](bounds);
  }

  shipWindowVisible() {
    return _.get(this._data, ['shipWindowVisible'], false);
  }

  shipWindowSort() {
    return _.get(this._data, ['shipWindowSort'], {});
  }

  shipWindowFilter() {
    return _.get(this._data, ['shipWindowFilter'], {});
  }

  mute() {
    return _.get(this._data, ['mute'], false) == true;
  }

  sqlPresetList() {
    return _.get(this._data, ['sqlPresetList'], {});
  }

  data() {
    const result = {};
    for (let key in this._data) {
      result[key] = this._data[key];
    }
    result['version'] = VERSION;
    return result;
  }

  saveTo(filepath) {
    fs.writeFile(filepath, JSON.stringify(this.data(), null, 2), () => {
    });
  }

  language() {
    return _.get(this._data, ['language'], 'ja');
  }

  get shipWindowColumnWidth() {
    return _.get(this._data, ['shipWindowColumnWidth'], {});
  }

  get shipWindowColumnVisibility() {
    return _.get(this._data, ['shipWindow.ColumnVisibility'], {});
  }
}

module.exports = Config;
