'use strict;'

class Rat {
  constructor(num, denom) {
    this._num = num;
    this._denom = denom;
  }

  numerator() {
    return this._num;
  }

  denominator() {
    return this._denom;
  }

  value() {
    return this._num / this._denom;
  }

  toString() {
    return this._num + "/" + this._denom;
  }

  static fromString(str) {
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
  }
}

module.exports = Rat;
