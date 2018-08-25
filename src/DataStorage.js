'use strict;'

const {ipcRenderer} = require('electron');
const {EventEmitter} = require('events');
const _ = require('lodash');
const SlotitemList = require(__dirname + '/SlotitemList.js'),
      Port = require(__dirname + '/Port.js'),
      Master = require(__dirname + '/Master.js'),
      Slotitem = require(__dirname + '/Slotitem.js');

function DataStorage() {
  EventEmitter.call(this);

  if (!ipcRenderer) {
    throw "DataStorage should construct on Renderer process";
  }
  this.master = new Master(ipcRenderer);
  this.slotitems = new SlotitemList();

  const self = this;
  ipcRenderer.on('api_port/port', function(event, data) {
    const port = new Port(JSON.parse(data), self);
    self.emit('port', port);
  });

  ipcRenderer.on('api_get_member/require_info', function(event, data) {
    const json = JSON.parse(data);
    const slot_items = _.get(json, ['api_data', 'api_slot_item'], []);
    const list = slot_items.map(function(d) {
      const mst_id = _.get(d, ['api_slotitem_id'], -1);
      const mst = self.master.slotitems[mst_id];
      return new Slotitem(d, mst);
    });
    self.slotitems.replace(list);
  });
}

DataStorage.prototype = Object.create(EventEmitter.prototype);

module.exports = DataStorage;
