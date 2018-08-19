'use strict;'

const _ = require('lodash');

function MasterDataAccessor(data) {
  this._data = data;
}

MasterDataAccessor.prototype.getShipMaster = function(mst_id) {
  const ships = _.get(this._data, ['api_data', 'api_mst_ship'], []);
  return _.find(ships, function(it) {
    return mst_id == _.get(it, ['api_id'], -1);
  });
};

module.exports = MasterDataAccessor;
