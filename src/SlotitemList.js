'use strict;'

const _ = require('lodash'),
      Slotitem = require(__dirname + '/Slotitem.js'),
      Master = require(__dirname + '/Master.js');
const {ipcRenderer} = require('electron');

function SlotitemList() {
  this._list = [];
  this._lut = {};
}

SlotitemList.prototype.replace = function(list) {
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

SlotitemList.prototype.push = function(item) {
  this._list.push(item);
  this._lut[item.id()] = item;
};

module.exports = SlotitemList;
