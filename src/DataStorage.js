'use strict;'

const {ipcRenderer} = require('electron');
const {EventEmitter} = require('events');
const _ = require('lodash');
const {URLSearchParams} = require('url');
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
  this.port = null;

  const self = this;
  ipcRenderer.on('api_port/port', function(event, data, request_body) {
    const port = new Port(JSON.parse(data), self);
    port.decks.forEach(function(deck) {
      const mission_finish_time = deck.mission_finish_time();
      deck.ships.forEach(function(ship) {
        ship.set_mission(mission_finish_time > 0);
      });
    });
    self.port = port;
    self.emit('port', port);
  });

  ipcRenderer.on('api_get_member/require_info', function(event, data, request_body) {
    const json = JSON.parse(data);
    const slot_items = _.get(json, ['api_data', 'api_slot_item'], []);
    const list = slot_items.map(function(d) {
      const mst_id = _.get(d, ['api_slotitem_id'], -1);
      const mst = self.master.slotitems[mst_id];
      return new Slotitem(d, mst);
    });
    self.slotitems.replace(list);
  });

  ipcRenderer.on('api_req_hensei/change', function(event, data, request_body) {
    const port = self.port;
    if (port == null) {
      console.log("port is null");
      return;
    }
    const params = new URLSearchParams(request_body);
    const deck_index = params.get('api_id');
    const ship_index = params.get('api_ship_idx');
    const to_ship_id = params.get('api_ship_id');
    if (deck_index <= 0 || port.decks.length < deck_index) {
      console.log("deck_index out of range")
      return;
    }
    const deck = port.decks[deck_index - 1];
    if (ship_index < 0) {
      console.log("ship_index out of range");
      return;
    }

    if (deck.ships.length <= ship_index) {
      const index = _.findIndex(deck.ships, (it) => it.id() == to_ship_id);
      if (index >= 0) {
        // 既存の艦を空欄にドロップした
        const ship = deck.ships[index];
        deck.ships.splice(index, 1);
        deck.ships.push(ship);
      } else {
        // 艦隊外の艦娘を新たに選んだ
        const ship = port.ship(to_ship_id);
        if (ship) {
          deck.ships.push(ship);
        }
      }
    } else {
      if (to_ship_id == -2) {
        // 随伴艦一括解除
        deck.ships.splice(1, deck.ships.length - 1);
      } else if (to_ship_id == -1) {
        // はずす
        deck.ships.splice(ship_index, 1);
      } else {
        const from_ship = deck.ships[ship_index];
        const index = _.findIndex(deck.ships, (it) => it.id() == to_ship_id);
        if (index >= 0) {
          // 既存の艦と入れ替え
          const ship = deck.ships[index];
          deck.ships[index] = from_ship;
          deck.ships[ship_index] = ship;
        } else {
          // 艦隊外の艦娘を新たに選んだ
          const ship = port.ship(to_ship_id);
          if (ship) {
            deck.ships[ship_index] = ship;
          }
        }
      }
    }
    self.emit('port', port);
  });
}

DataStorage.prototype = Object.create(EventEmitter.prototype);

module.exports = DataStorage;
