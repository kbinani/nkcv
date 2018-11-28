'use strict;'

const _ = require('lodash');

class NDockShip {
  constructor(data, port) {
    this._data = data;
    this._port = port;
  }

  state() {
    // 0: 未使用
    // 1: 使用中
    return _.get(this._data, ['api_state'], 0);
  }

  complete_time() {
    const ms = parseInt(_.get(this._data, ['api_complete_time'], 0), 10);
    return new Date(ms);
  }

  ship() {
    const ship_id = parseInt(_.get(this._data, ['api_ship_id'], 0), 10);
    return this._port.ship(ship_id);
  }
}


class NDock {
  constructor(data, port) {
    this._data = data;
    this._port = port;
  }

  ships() {
    const self = this;
    return this._data.map((data) => {
      return new NDockShip(data, self._port);
    });
  }

  complete(index) {
    _.set(this._data, [index, 'api_complete_time'], 0);
    _.set(this._data, [index, 'api_complete_time_str'], '');
  }
}

module.exports = NDock;
