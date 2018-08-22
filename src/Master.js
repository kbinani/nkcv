'use strict;'

const HTTPProxy = require(__dirname + '/HTTPProxy.js'),
      _ = require('lodash');
const {ipcRenderer} = require('electron');

function Master() {
  this._callbacks = {};
  this._last = null;
  this._maxObserverKeyId = -1;
  this.ships = {};
  this.slotitems = {};

  const self = this;
  if (ipcRenderer) {
    ipcRenderer.on('api_start2/getData', function(event, data) {
      const changed = self._last != data;
      if (changed) {
        const json = JSON.parse(data);
        for (var i = 0; i < self._callbacks.length; i++) {
          self._callbacks[i](json);
        }
        self._last = data;

        self.ships = {};
        const ships = _.get(json, ['api_data', 'api_mst_ship'], []);
        ships.forEach(function(it) {
          const id = _.get(it, ['api_id'], -1);
          self.ships[id] = it;
        });

        self.slotitems = {};
        const slotitems = _.get(json, ['api_data', 'api_mst_slotitem'], []);
        slotitems.forEach(function(it) {
          const id = _.get(it, ['api_id'], -1);
          self.slotitems[id] = it;
        });
      }
    });
  }
}

Master.prototype.addObserver = function(callback) {
  this._maxObserverKeyId++;
  this._callbacks[this._maxObserverKeyId] = callback;
  if (this._last != null) {
    const json = JSON.parse(this._last);
    callback(json);
  }
  return this._maxObserverKeyId;
};

Master.prototype.removeObserver = function(key) {
  if (key in this._callbacks) {
    delete this._callbacks[key];
  }
};

Master.prototype.data = function() {
  if (this._last == null) {
    return {};
  }
  return JSON.parse(this._last);
};

Master.shared = new Master();

module.exports = Master;
