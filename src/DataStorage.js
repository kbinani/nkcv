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
  this.master = new Master();
  this.slotitems = new SlotitemList();
  this.port = null;

  const self = this;

  [
    'api_req_hensei/change',
    'api_req_hensei/preset_select',
    'api_get_member/ship3',
    'api_get_member/ship_deck',
    'api_req_hokyu/charge',
    'api_req_map/start',
    'api_get_member/deck',
    'api_req_kousyou/destroyship',
    'api_req_practice/battle',
  ].forEach((api) => {
    ipcRenderer.on(api, (_, response, request) => {
      const port = self.port;
      if (!port) {
        return;
      }
      const params = new URLSearchParams(request);
      const json = JSON.parse(response);
      self.handle(api, params, json, port);
    });
  });

  ipcRenderer.on('api_port/port', function(event, data, request_body) {
    const port = new Port(JSON.parse(data), self);
    port.decks.forEach(function(deck) {
      const mission_finish_time = deck.mission_finish_time();
      deck.ships.forEach(function(ship) {
        ship.set_mission(mission_finish_time > 0);
      });
    });
    self.port = port;
    self.notify_port();
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

  ipcRenderer.on('api_get_member/slot_item', (api, response, request) => {
    const json = JSON.parse(response);
    const list = _.get(json, ['api_data'], []);
    const slotitems = list.map((data) => {
      const mst_id = _.get(data, ['api_slotitem_id'], -1);
      if (mst_id < 0) {
        return null;
      }
      const mst = self.master.slotitems[mst_id];
      return new Slotitem(data, mst);
    }).filter((it) => it != null);
    self.slotitems.replace(slotitems);
  });
}

DataStorage.prototype = Object.create(EventEmitter.prototype);

DataStorage.prototype.notify_port = function() {
  if (this.port) {
    this.emit('port', this.port);
  }
};

DataStorage.prototype.handle = function(api, params, response, port) {
  switch (api) {
    case 'api_req_hensei/change':
      this.handle_req_hensei_change(params, response, port);
      break;
    case 'api_req_hensei/preset_select':
      this.handle_req_hensei_preset_select(params, response, port);
      break;
    case 'api_get_member/ship3', 'api_get_member/ship_deck':
      this.handle_get_member_ship_deck(params, response, port);
      break;
    case 'api_req_hokyu/charge':
      this.handle_req_hokyu_charge(params, response, port);
      break;
    case 'api_req_map/start':
      this.handle_req_map_start(params, response, port);
      break;
    case 'api_get_member/deck':
      this.handle_get_member_deck(params, response, port);
      break;
    case 'api_req_kousyou/destroyship':
      this.handle_req_kousyou_destroyship(params, response, port);
      break;
    case 'api_req_practice/battle':
      this.handle_req_practice_battle(params, response, port);
      break;
  }
};

DataStorage.prototype.handle_get_member_ship_deck = function(params, response, port) {
  const ship_data_list = _.get(response, ['api_data', 'api_ship_data'], []);
  ship_data_list.forEach((data) => {
    const id = _.get(data, ['api_id'], -1);
    if (id < 0) {
      return;
    }
    const ship = port.ship(id);
    if (!ship) {
      return;
    }
    ship.update(data);
  });

  const deck_data_list = _.get(response, ['api_data', 'api_deck_data'], []);
  deck_data_list.forEach((data) => {
    const index = _.get(data, ['api_id'], -1) - 1;
    if (index < 0 || port.decks.length <= index) {
      return;
    }
    const deck = port.decks[index];
    deck.update(data);
  });

  this.notify_port();
};

DataStorage.prototype.handle_req_hensei_change = function(params, response, port) {
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

        // 選んだ艦娘が別の艦隊に含まれていたら取り除く
        for (var i = 0; i < port.decks.length; i++) {
          if (i == deck_index - 1) {
            continue;
          }
          const d = port.decks[i];
          const j = _.findIndex(d.ships, (it) => it.id() == to_ship_id);
          if (j >= 0) {
            d.ships.splice(j, 1);
            break;
          }
        }
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

        // 選んだ艦娘が別の艦隊に含まれていたら交換する
        for (var i = 0; i < port.decks.length; i++) {
          if (i == deck_index - 1) {
            continue;
          }
          const d = port.decks[i];
          const j = _.findIndex(d.ships, (it) => it.id() == to_ship_id);
          if (j >= 0) {
            d.ships[j] = from_ship;
            break;
          }
        }
      }
    }
  }
  this.notify_port();
};

DataStorage.prototype.handle_req_hensei_preset_select = function(params, response, port) {
  const deck_index = parseInt(params.get('api_deck_id'), 10) - 1;
  const ship_id_list = _.get(response, ['api_data', 'api_ship'], []);
  if (deck_index < 0 || port.decks.length <= deck_index) {
    return;
  }
  const deck = port.decks[deck_index];
  deck.ships = ship_id_list.filter((id) => id > 0)
                           .map((id) => port.ship(id))
                           .filter((ship) => ship != null);
  this.notify_port();
};

DataStorage.prototype.handle_req_hokyu_charge = function(params, response, port) {
  const ship_list = _.get(response, ['api_data', 'api_ship'], []);
  ship_list.forEach((data) => {
    const id = _.get(data, ['api_id'], -1);
    const ship = port.ship(id);
    if (!ship) {
      return;
    }
    const fuel = _.get(data, ['api_fuel'], -1);
    if (fuel >= 0) {
      ship.set_fuel(fuel);
    }
    const bull = _.get(data, ['api_bull'], -1);
    if (bull >= 0) {
      ship.set_bull(bull);
    }
  });
  this.notify_port();
};

DataStorage.prototype.handle_req_map_start = function(params, response, port) {
  const deck_index = parseInt(params.get('api_deck_id'), 10) - 1;
  if (deck_index < 0 || port.decks.length <= deck_index) {
    return;
  }
  const deck = port.decks[deck_index];
  deck.in_combat = true;
  this.notify_port();
};

DataStorage.prototype.handle_get_member_deck = function(params, response, port) {
  const list = _.get(response, ['api_data'], []);
  list.forEach((data) => {
    const deck_index = _.get(data, ['api_id'], -1) - 1;
    if (deck_index < 0 || port.decks.length <= deck_index) {
      return;
    }
    const deck = port.decks[deck_index];
    deck.update(data);
  });
  this.notify_port();
};

DataStorage.prototype.handle_req_kousyou_destroyship = function(params, response, port) {
  const ship_id_list = params.get('api_ship_id').split(',').map((it) => parseInt(it, 10));
  const destroy_slotitems = parseInt(params.get('api_slot_dest_flag'), 10) == 1;
  ship_id_list.forEach((ship_id) => {
    port.destroy_ship(ship_id, destroy_slotitems);
  });
  this.notify_port();
};

DataStorage.prototype.handle_req_practice_battle = function(params, response, port) {
  const deck_id = parseInt(params.get('api_deck_id'), 10);
  if (deck_id <= 0 || port.decks.length < deck_id) {
    return;
  }
  const deck = port.decks[deck_id - 1];
  deck.in_combat = true;
  this.notify_port();
};

module.exports = DataStorage;
