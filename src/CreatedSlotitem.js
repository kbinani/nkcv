'use strict;'

const _ = require('lodash');

function CreatedSlotitem(slotitem_master, slotitem) {
  this._slotitem_master = slotitem_master;
  this.slotitem = slotitem;
}

CreatedSlotitem.prototype.name = function() {
  return _.get(this._slotitem_master, ['api_name'], '');
};

module.exports = CreatedSlotitem;
