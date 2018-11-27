'use strict;'

const _ = require('lodash');

class CreatedSlotitem {
  constructor(slotitem_master, slotitem) {
    this._slotitem_master = slotitem_master;
    this.slotitem = slotitem;
  }

  name() {
    return _.get(this._slotitem_master, ['api_name'], '');
  }
}

module.exports = CreatedSlotitem;
