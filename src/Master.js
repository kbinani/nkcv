'use strict;'

const HTTPProxy = require(__dirname + '/HTTPProxy.js');

function Master() {
  this._callbacks = {};
  this._last = null;
  this._maxObserverKeyId = -1;

  const self = this;
  HTTPProxy.on('api_start2/getData', function(data) {
    const changed = self._last != data;
    if (changed) {
      for (var i = 0; i < self._callbacks.length; i++) {
        const json = JSON.parse(data);
        self._callbacks[i](json);
      }
      this._last = data;
    }
  });
}

const _ = Master;

_.prototype.addObserver = function(callback) {
  this._maxObserverKeyId++;
  this._callbacks[this._maxObserverKeyId] = callback;
  if (this._last != null) {
    const json = JSON.parse(this._last);
    callback(json);
  }
  return this._maxObserverKeyId;
};

_.prototype.removeObserver = function(key) {
  if (key in this._callbacks) {
    delete this._callbacks[key];
  }
};

_.shared = new Master();

module.exports = _;
