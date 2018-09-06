'use strict;'

function Rat(num, denom) {
  this._num = num;
  this._denom = denom;
}

var _ = Rat;

_.prototype.numerator = function() {
  return this._num;
};

_.prototype.denominator = function() {
  return this._denom;
}

_.prototype.value = function() {
  return this._num / this._denom;
}

_.prototype.toString = function() {
  return this._num + "/" + this._denom;
};

Rat.fromString = function(str) {
  const item = str.split('/').map((it) => parseInt(it, 10));
  if (item.length != 2) {
    return null;
  }
  const num = item[0];
  const denom = item[1];
  if (isNaN(num) || isNaN(denom)) {
    return null;
  }
  if (denom <= 0) {
    return null;
  }
  return new Rat(num ,denom);
};

module.exports = Rat;
