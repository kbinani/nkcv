'use strict;'

const _ = require('lodash');

function Speed(value) {
  this._value = value;
}

const mapping = {
  5: '低速',
  10: '高速',
  15: '高速+',
  20: '最速',
};

Speed.prototype.toString = function() {
  return _.get(mapping, [this._value], '不明(' + this._value + ')');
};

Speed.prototype.value = function() {
  return this._value;
};

module.exports = Speed;
