'use strict;'

const _ = require('lodash'),
      fs = require('fs');

const Rat = require(__dirname + '/Rat.js');

const keys = {
  'scale': 'rat',
  'mainWindow.bounds': 'bounds',
  'shipWindow.bounds': 'bounds',
  'shipWindowVisible': 'bool',
};

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
};

function Config(data) {
  this._data = {};
  this.patch(data);
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

Config.prototype.data = function() {
  const result = {};
  for (var key in this._data) {
    result[key] = this._data[key];
  }
  return result;
};

Config.prototype.save_to = function(filepath) {
  fs.writeFile(filepath, JSON.stringify(this.data(), null, 2), () => {
  });
};

module.exports = Config;
