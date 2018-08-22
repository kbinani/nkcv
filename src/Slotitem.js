'use strict;'

const _ = require('lodash');

function Slotitem(data, masterData) {
  this._data = data;
  this._master_data = masterData;
}

Slotitem.prototype.id = function() {
  return _.get(this._data, ['api_id'], -1);
};

Slotitem.prototype.name = function() {
  console.log("this._master_data=" + JSON.stringify(this._master_data, null, 2));
  return _.get(this._master_data, ['api_name'], '');
};

module.exports = Slotitem;
