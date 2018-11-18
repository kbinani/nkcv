'use strict;'

const _ = require('lodash');

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

class ShipType {
  constructor(raw) {
    this._raw = raw;
  }

  toString() {
    return _.get(mapping, [this._raw], `不明(${this._raw})`);
  }

  value() {
    return this._raw;
  }

  static allCases() {
    return Object.keys(mapping).map((raw) => {
      return new ShipType(parseInt(raw, 10));
    });
  }
}

module.exports = ShipType;
