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
};

const VERSION = 0;

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
      return data;
    default:
      return {};
  }
}

function Config(data) {
  this._data = {};
  this.patch(migrate(data));
}

Config.prototype.patch = function(data, callback) {
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
};

Config.prototype.scale = function() {
  return _.get(this._data, ['scale'], '1200/1200');
};

Config.prototype.mainWindowBounds = function() {
  const bounds = _.get(this._data, ['mainWindow.bounds'], null);
  return sanitizer_mapping['bounds'](bounds);
};

Config.prototype.shipWindowBounds = function() {
  const bounds = _.get(this._data, ['shipWindow.bounds'], null);
  return sanitizer_mapping['bounds'](bounds);
};

Config.prototype.shipWindowVisible = function() {
  return _.get(this._data, ['shipWindowVisible'], false);
}

Config.prototype.shipWindowSort = function() {
  return _.get(this._data, ['shipWindowSort'], {});
};

Config.prototype.shipWindowFilter = function() {
  return _.get(this._data, ['shipWindowFilter'], {});
};

Config.prototype.mute = function() {
  return _.get(this._data, ['mute'], false) == true;
};

Config.prototype.sqlPresetList = function() {
  return _.get(this._data, ['sqlPresetList'], {});
};

Config.prototype.data = function() {
  const result = {};
  for (var key in this._data) {
    result[key] = this._data[key];
  }
  result['version'] = VERSION;
  return result;
};

Config.prototype.save_to = function(filepath) {
  fs.writeFile(filepath, JSON.stringify(this.data(), null, 2), () => {
  });
};

Config.prototype.language = function() {
  return _.get(this._data, ['language'], 'ja');
}

module.exports = Config;
