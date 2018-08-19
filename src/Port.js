'use strict;'

const HTTPProxy = require(__dirname + '/HTTPProxy.js'),
      MasterDataAccessor = require(__dirname + '/MasterDataAccessor.js'),
      Ship = require(__dirname + '/Ship.js'),
      Deck = require(__dirname + '/Deck.js'),
      _ = require('lodash');

function Port(data, masterData) {
  this._data = data;
  this._master = new MasterDataAccessor(masterData);

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

HTTPProxy.on('api_port/port', function(data) {
  for (var key in observers) {
    observers[key](JSON.parse(data));
  }
});

Port.addObserver = function(callback) {
  maxObserverId++;
  observers[maxObserverId] = callback;
  return maxObserverId;
};

module.exports = Port;
