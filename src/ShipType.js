'use strict;'

const _ = require('lodash');

function ShipType(raw) {
  this._raw = raw;
}

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

ShipType.prototype.toString = function() {
  return _.get(mapping, [this._raw], 'Unknown(' + this._raw + ')');
};

ShipType.prototype.value = function() {
  return this._raw;
};

ShipType.allCases = function() {
  return Object.keys(mapping).map(function(raw) {
    return new ShipType(parseInt(raw, 10));
  });
};

module.exports = ShipType;
