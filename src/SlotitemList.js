'use strict;'

const _ = require('lodash'),
      Slotitem = require(__dirname + '/Slotitem.js'),
      Master = require(__dirname + '/Master.js');
const {ipcRenderer} = require('electron');

function SlotitemList() {
  this._list = [];
  this._lut = {};
}

SlotitemList.shared = new SlotitemList();

if (ipcRenderer) {
  ipcRenderer.on('api_get_member/require_info', function(event, data) {
    const json = JSON.parse(data);
    const slot_items = _.get(json, ['api_data', 'api_slot_item'], []);
    const list = slot_items.map(function(d) {
      const mst_id = _.get(d, ['api_slotitem_id'], -1);
      const mst = Master.shared.slotitems[mst_id];
      return new Slotitem(d, mst);
    });
    SlotitemList.shared._replace(list);
  });
}

SlotitemList.prototype._replace = function(list) {
  this._list = list;
  this._lut = {};
  const self = this;
  list.forEach(function(it) {
    self._lut[it.id()] = it;
  });
};

SlotitemList.prototype.slotitem = function(id) {
  return this._lut[id];
};

module.exports = SlotitemList;
