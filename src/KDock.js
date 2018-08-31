'use strict;'

const _ = require('lodash');

function KDock(data, master) {
  this._data = data;
  this._master = master;
}

function KDockShip(data, master) {
  this._data = data;
  const mst_id = _.get(data, ['api_created_ship_id'], -1);
  this._master = master.ship(mst_id);
}

KDockShip.prototype.name = function() {
  return _.get(this._master, ['api_name'], '' + _.get(this._data, ['api_created_ship_id'], 0));
};

KDockShip.prototype.complete_time = function() {
  return _.get(this._data, ['api_complete_time'], 0);
};

KDockShip.prototype.state = function() {
  return _.get(this._data, ['api_state'], -1);
};

KDock.prototype.ships = function() {
  const self = this;
  return this._data.map((data) => {
    return new KDockShip(data, self._master);
  });
};

module.exports = KDock;
