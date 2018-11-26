'use strict;'

const _ = require('lodash');

class KDock {
  constructor(data, master) {
    this._data = data;
    this._master = master;
  }

  ships() {
    return this._data.map((data) => {
      return new KDockShip(data, this._master);
    });
  }

  complete(index) {
    _.set(this._data, [index, 'api_complete_time'], 0);
    _.set(this._data, [index, 'api_complete_time_str'], '0');
    _.set(this._data, [index, 'api_state'], 3);
  }
}

class KDockShip {
  constructor(data, master) {
    this._data = data;
    const mst_id = _.get(data, ['api_created_ship_id'], -1);
    this._master = master.ship(mst_id);
  }

  name() {
    return _.get(this._master, ['api_name'], '' + _.get(this._data, ['api_created_ship_id'], 0));
  }

  complete_time() {
    const ms = _.get(this._data, ['api_complete_time'], 0);
    return new Date(ms);
  }

  state() {
    return _.get(this._data, ['api_state'], -1);
  }
}

module.exports = KDock;
