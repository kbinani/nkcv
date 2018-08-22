'use strict;'

const _ = require('lodash'),
      Rat = require(__dirname + '/Rat.js'),
      SlotitemList = require(__dirname + '/SlotitemList.js');

function Ship(data, master_data) {
  this._data = data;
  this._master_data = master_data;
}

Ship.prototype.id = function() {
  return _.get(this._data, ['api_id'], 0);
};

Ship.prototype.name = function() {
  return _.get(this._master_data, ['api_name'], '');
};

Ship.prototype.level = function() {
  return _.get(this._data, ['api_lv'], 0);
};

Ship.prototype.hp = function() {
  const nowhp = _.get(this._data, ['api_nowhp'], 0);
  const maxhp = _.get(this._data, ['api_maxhp'], 0);
  if (maxhp <= 0) {
    return null;
  }
  return new Rat(nowhp, maxhp);
};

Ship.prototype.cond = function() {
  return _.get(this._data, ['api_cond'], 0);
};

Ship.prototype.next_exp = function() {
  return _.get(this._data, ['api_exp', 1], 0);
};

Ship.prototype.fuel = function() {
  const fuel = _.get(this._data, ['api_fuel'], 0);
  const fuel_max = _.get(this._master_data, ['api_fuel_max'], 0);
  return new Rat(fuel, fuel_max);
};

Ship.prototype.bull = function() {
  const bull = _.get(this._data, ['api_bull'], 0);
  const bull_max = _.get(this._master_data, ['api_bull_max'], 0);
  return new Rat(bull, bull_max);
};

Ship.prototype.type = function() {
  const stype = _.get(this._master_data, ['api_stype'], -1);
  const mapping = {
    1: "海防",
    2: "駆",
    3: "軽巡",
    4: "雷巡",
    5: "重",
    6: "航巡",
    7: "軽母",
    8: "高戦",
    9: "戦",
    10: "航戦",
    11: "航",
    13: "潜",
    14: "潜母",
    16: "水母",
    17: "揚陸",
    18: "装母",
    19: "工",
    20: "潜母",
    21: "練巡",
    22: "補給",
  };
  if (stype in mapping) {
    return mapping[stype];
  } else {
    return "" + stype;
  }
};

Ship.prototype.slotitems = function() {
  const items = _.get(this._data, ['api_slot'], []);
  return items.map(function(it) {
    if (it <= 0) {
      return null;
    }
    return SlotitemList.shared.slotitem(it);
  }).filter(function(it) { return it != null; });
};

module.exports = Ship;
