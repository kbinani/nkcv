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

Deck.prototype.mission_finish_time = function() {
  const time = _.get(this._data, ['api_mission', 2], 0);
  if (time == 0) {
    return null;
  }
  return new Date(time);
};

Deck.prototype.is_ready_to_sally = function() {
  const time = _.get(this._data, ['api_mission', 2], 0);
  if (time > 0) {
    return false;
  }
  for (var i = 0; i < this.ships.length; i++) {
    const ship = this.ships[i];
    const fuel = ship.fuel();
    const bull = ship.bull();
    const hp = ship.hp();
    if (fuel.numerator() < fuel.denominator()) {
      return false;
    }
    if (bull.numerator() < bull.denominator()) {
      return false;
    }
    if (hp.value() <= 0.5) {
      return false;
    }
    if (ship.cond() < 40) {
      return false;
    }
  }
  return true;
};

Deck.prototype.update = function(data) {
  this._data = data;
};

module.exports = Deck;
