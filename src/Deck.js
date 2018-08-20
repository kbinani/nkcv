'use strict;'

const _ = require('lodash');

function Deck(data, port) {
  this._data = data;
  this._port = port;

  const ships = _.get(data, ['api_ship'], []);
  this.ships = ships.map(function(id) {
    if (id <= 0) {
      return null;
    }
    return port.ship(id);
  }).filter(function(it) { return it != null; });
}

Deck.prototype.name = function() {
  return _.get(this._data, ['api_name'], '');
};

module.exports = Deck;
