'use strict;'

const _ = require('lodash'),
      fs = require('fs');

const keys = {
  'scale': 'string',
  'mainWindow.bounds': 'object',
  'shipWindow.bounds': 'object'
};

function Config(data) {
  this._data = {};
  this.patch(data);
}

function _sanitize_bounds(bounds) {
  if (!bounds) {
    return {};
  }
  const x = _.get(bounds, ['x'], null);
  const y = _.get(bounds, ['y'], null);
  const width = _.get(bounds, ['width'], null);
  const height = _.get(bounds, ['height'], null);
  if (typeof(x) != 'number' || typeof(y) != 'number' || typeof(width) != 'number' || typeof(height) != 'number') {
    return {};
  }
  if (width <= 0 || height <= 0) {
    return {};
  }
  return {x: x, y: y, width: width, height: height};
}

Config.prototype.patch = function(data, callback) {
  for (var key in keys) {
    const expected_type = keys[key];
    const value = _.get(data, [key], null);
    if (value == null) {
      continue;
    }
    if (typeof(value) == expected_type) {
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
  return _sanitize_bounds(bounds);
};

Config.prototype.shipWindowBounds = function() {
  const bounds = _.get(this._data, ['shipWindow.bounds'], null);
  return _sanitize_bounds(bounds);
};

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
