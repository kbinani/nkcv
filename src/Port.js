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
    const mst = self._master.ships[mst_id];
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

Port.prototype.nickname = function() {
  return _.get(this._data, ['api_data', 'api_basic', 'api_nickname'], '');
};

Port.prototype.level = function() {
  return _.get(this._data, ['api_data', 'api_basic', 'api_level'], 1);
};

Port.prototype.comment = function() {
  return _.get(this._data, ['api_data', 'api_basic', 'api_comment'], '');
};

Port.prototype.rank = function() {
  const rank = _.get(this._data, ['api_data', 'api_basic', 'api_rank'], );
  const mapping = {
    1: '元帥',
    2: '大将',
    3: '中将',
    4: '少将',
    5: '大佐',
    6: '中佐',
    7: '新米中佐',
    8: '少佐',
    9: '中堅少佐',
    10: '新米少佐',
  };
  return _.get(mapping, [rank], '新米少佐');
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
