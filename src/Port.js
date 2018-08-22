'use strict;'

const Master = require(__dirname + '/Master.js'),
      Ship = require(__dirname + '/Ship.js'),
      Deck = require(__dirname + '/Deck.js'),
      _ = require('lodash');
const {ipcRenderer} = require('electron');

function Port(data, master) {
  this._data = data;
  this._master = master;

  const ships = _.get(data, ['api_data', 'api_ship'], []);
  const self = this;
  this.ships = ships.map(function(data) {
    const mst_id = _.get(data, ['api_ship_id'], -1);
    const mst = self._master.getShipMaster(mst_id);
    if (mst == null) {
      return null;
    }
    return new Ship(data, mst);
  }).filter(function(it) { return it != null; });

  const decks = _.get(data, ['api_data', 'api_deck_port'], []);
  this.decks = decks.map(function(data) {
    return new Deck(data, self);
  });
}

Port.prototype.ship = function(ship_id) {
  return _.find(this.ships, function(ship) {
    return ship.id() == ship_id;
  });
};

var maxObserverId = -1;
const observers = {};

if (ipcRenderer) {
  ipcRenderer.on('api_port/port', function(event, data) {
    for (var key in observers) {
      const port = new Port(JSON.parse(data), Master.shared);
      observers[key](port);
    }
  });
}

Port.addObserver = function(callback) {
  maxObserverId++;
  observers[maxObserverId] = callback;
  return maxObserverId;
};

module.exports = Port;
