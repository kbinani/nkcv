'use strict;'

const _ = require('lodash');

const mapping = {
  5: '低速',
  10: '高速',
  15: '高速+',
  20: '最速',
};

class Speed {
  constructor(value) {
    this._value = value;
  }

  toString() {
    return _.get(mapping, [this._value], `不明(${this._value})`);
  }

  value() {
    return this._value;
  }
}

module.exports = Speed;
