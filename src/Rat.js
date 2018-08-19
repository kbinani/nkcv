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

module.exports = Rat;
