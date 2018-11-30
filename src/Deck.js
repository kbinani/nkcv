'use strict;'

const _ = require('lodash');
const Speed = require(__dirname + '/Speed.js');

function Deck(data, port) {
  this._data = data;
  this._port = port;
  this.battle_cell = null;

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

Deck.prototype.set_name = function(name) {
  _.set(this._data, ['api_name'], name);
};

Deck.prototype.mission_finish_time = function() {
  const time = _.get(this._data, ['api_mission', 2], 0);
  if (time == 0) {
    return null;
  }
  return new Date(time);
};

Deck.prototype.is_ready_to_sortie = function() {
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
    if (hp.value() <= 0.25) {
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

Deck.prototype.soku = function() {
  const min_soku = _.reduce(this.ships, (result, value) => Math.min(result, value.soku().value()), 20);
  return new Speed(min_soku);
};

Deck.prototype.taiku = function() {
  var value = 0;
  this.ships.forEach((ship) => {
    const onslot = ship.onslot();
    _.forEach(ship.slotitems(), (slotitem, index) => {
      const taiku = slotitem.taiku();
      const eq = onslot[index];
      const level = slotitem.level();
      const proficiency = slotitem.proficiency();
      var rate = 0.2;
      if (slotitem.type() == "dive_bomber") {
        // 爆戦
        rate = 0.25;
      }
      const v = (taiku + rate * level) * Math.sqrt(eq) + Math.sqrt(proficiency / 10.0);
      value += v;
    });
  });
  return Math.floor(value);
};

Deck.prototype.sakuteki = function(cell_dependent_coefficient) {
  if (typeof(cell_dependent_coefficient) == 'undefined') {
    cell_dependent_coefficient = 1;
  }
  var value = 0;
  this.ships.forEach((ship) => {
    value += Math.sqrt(ship.sakuteki().numerator());

    const onslot = ship.onslot();
    _.forEach(ship.slotitems(), (slotitem, index) => {
      const proficiency = slotitem.proficiency();
      const sakuteki = slotitem.sakuteki() + slotitem.sakuteki_proficiency_coefficient() * Math.sqrt(proficiency);
      value += cell_dependent_coefficient * slotitem.sakuteki_coefficient() * sakuteki;
    });
  });
  return Math.floor(value);
};

module.exports = Deck;
