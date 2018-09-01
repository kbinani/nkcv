'use strict;'

const _ = require('lodash');

function NDock(data, port) {
  this._data = data;
  this._port = port;
}

function NDockShip(data, port) {
  this._data = data;
  this._port = port;
}

NDockShip.prototype.state = function() {
  // 0: 未使用
  // 1: 使用中
  return _.get(this._data, ['api_state'], 0);
};

NDockShip.prototype.complete_time = function() {
  const ms = parseInt(_.get(this._data, ['api_complete_time'], 0), 10);
  return new Date(ms);
};

NDockShip.prototype.ship = function() {
  const ship_id = parseInt(_.get(this._data, ['api_ship_id'], 0), 10);
  return this._port.ship(ship_id);
};

NDock.prototype.ships = function() {
  const self = this;
  return this._data.map((data) => {
    return new NDockShip(data, self._port);
  });
};

NDock.prototype.complete = function(index) {
  _.set(this._data, [index, 'api_complete_time'], 0);
  _.set(this._data, [index, 'api_complete_time_str'], '');
};

module.exports = NDock;
