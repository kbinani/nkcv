'use strict;'

const _ = require('lodash');
const {ipcRenderer} = require('electron');

class Master {
  constructor() {
    this._callbacks = {};
    this._last = null;
    this._maxObserverKeyId = -1;
    this.ships = {};
    this.slotitems = {};

    ipcRenderer.on('api_start2/getData', (event, data, request_body) => {
      const changed = this._last != data;
      if (changed) {
        const json = JSON.parse(data);
        for (var i = 0; i < this._callbacks.length; i++) {
          this._callbacks[i](json);
        }
        this._last = data;

        this.ships = {};
        const ships = _.get(json, ['api_data', 'api_mst_ship'], []);
        ships.forEach((it) => {
          const id = _.get(it, ['api_id'], -1);
          this.ships[id] = it;
        });

        this.slotitems = {};
        const slotitems = _.get(json, ['api_data', 'api_mst_slotitem'], []);
        slotitems.forEach((it) => {
          const id = _.get(it, ['api_id'], -1);
          this.slotitems[id] = it;
        });
      }
    });
  }

  ship(mst_id) {
    const data = this._last;
    if (!data) {
      return null;
    }
    const json = JSON.parse(data);
    const ships = _.get(json, ['api_data', 'api_mst_ship'], []);
    return _.find(ships, (mst) => {
      const id = _.get(mst, ['api_id'], -1);
      return id == mst_id;
    });
  }

  slotitem(mst_id) {
    const data = this._last;
    if (!data) {
      return null;
    }
    const json = JSON.parse(data);
    const slotitems = _.get(json, ['api_data', 'api_mst_slotitem'], []);
    return _.find(slotitems, (mst) => {
      const id = _.get(mst, ['api_id'], -1);
      return id == mst_id;
    });
  }

  data() {
    if (this._last == null) {
      return {};
    }
    return JSON.parse(this._last);
  }
}

module.exports = Master;
