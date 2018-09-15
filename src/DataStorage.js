'use strict;'

const {ipcRenderer} = require('electron');
const {EventEmitter} = require('events');
const _ = require('lodash');
const {URLSearchParams} = require('url');
const SlotitemList = require(__dirname + '/SlotitemList.js'),
      Port = require(__dirname + '/Port.js'),
      Master = require(__dirname + '/Master.js'),
      Slotitem = require(__dirname + '/Slotitem.js'),
      QuestList = require(__dirname + '/QuestList.js'),
      KDock = require(__dirname + '/KDock.js'),
      Ship = require(__dirname + '/Ship.js'),
      NDock = require(__dirname + '/NDock.js'),
      CreatedSlotitem = require(__dirname + '/CreatedSlotitem.js'),
      BattleCell = require(__dirname + '/BattleCell.js');

function DummyBattleCell(area, map, no) {
  this.area = area;
  this.map = map;
  this.no = no;
}

DummyBattleCell.prototype.name = function() {
  return '';
}

function PracticeBattleCell() {
}

PracticeBattleCell.prototype.name = function() {
  return '';
};

function DataStorage() {
  EventEmitter.call(this);

  if (!ipcRenderer) {
    throw "DataStorage should construct on Renderer process";
  }
  this.master = new Master();
  this.slotitems = new SlotitemList();
  this.port = null;
  this.questlist = null;
  this.kdock = null;
  this.ndock = null;
  this._next_battle_cell = null;

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
    'api_req_kaisou/slot_deprive',
    'api_req_kaisou/slot_exchange_index',
    'api_req_member/updatedeckname',
    'api_get_member/ndock',
    'api_req_nyukyo/speedchange',
    'api_req_nyukyo/start',
    'api_req_map/next',
    'api_req_sortie/battle',
    'api_req_sortie/ld_airbattle',
    'api_req_hensei/combined',
    'api_req_combined_battle/battle',
    'api_req_combined_battle/battle_water',
    'api_req_combined_battle/each_battle_water',
    'api_req_combined_battle/each_battle',
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
    const json = JSON.parse(data);
    const port = new Port(json, self);
    port.decks.forEach(function(deck) {
      const mission_finish_time = deck.mission_finish_time();
      deck.ships.forEach(function(ship) {
        ship.set_mission(mission_finish_time > 0);
      });
    });
    self.port = port;
    this._next_battle_cell = null;

    self.notify_port();

    const ndock_data = _.get(json, ['api_data', 'api_ndock'], []);
    const ndock = new NDock(ndock_data, port);
    self.notify_ndock(ndock);
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

    const kdock_data = _.get(json, ['api_data', 'api_kdock'], []);
    const kdock = new KDock(kdock_data, self.master);
    self.kdock = kdock;
    self.emit('kdock', kdock);
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

  ipcRenderer.on('api_get_member/questlist', (api, response, request) => {
    const json = JSON.parse(response);
    if (self.questlist == null) {
      self.questlist = new QuestList();
    }
    self.questlist.update(json);
    self.notify_questlist();
  });

  ipcRenderer.on('api_req_kousyou/getship', (api, response, request) => {
    const json = JSON.parse(response);
    const kdock_data = _.get(json, ['api_data', 'api_kdock'], []);
    const kdock = new KDock(kdock_data, self.master);
    self.kdock = kdock;
    self.emit('kdock', kdock);

    const port = self.port;
    if (!port) {
      return;
    }
    const ship_data = _.get(json, ['api_data', 'api_ship'], null);
    if (!ship_data) {
      return;
    }
    const ship_id = _.get(ship_data, ['api_ship_id'], -1);
    const ship_master = self.master.ship(ship_id);
    if (!ship_master) {
      return;
    }
    const ship = new Ship(ship_data, ship_master, self);
    port.ships.push(ship);
    self.notify_port();
  });

  ipcRenderer.on('api_get_member/kdock', (api, response, request) => {
    const json = JSON.parse(response);
    const kdock_data = _.get(json, ['api_data'], []);
    const kdock = new KDock(kdock_data, self.master);
    self.kdock = kdock;
    self.emit('kdock', kdock);
  });

  ipcRenderer.on('api_req_kousyou/createship_speedchange', (api, response, request) => {
    const params = new URLSearchParams(request);
    const dock_id = parseInt(params.get('api_kdock_id'), 10);
    const kdock = self.kdock;
    if (!kdock) {
      return;
    }
    kdock.complete(dock_id - 1);
    self.kdock = kdock;
    self.emit('kdock', kdock);
  });

  ipcRenderer.on('api_req_kousyou/createitem', (api, response, request) => {
    const json = JSON.parse(response);
    const success = _.get(json, ['api_data', 'api_create_flag'], 0) == 1;
    if (success) {
      const mst_id = _.get(json, ['api_data', 'api_slot_item', 'api_slotitem_id'], -1);
      const id = _.get(json, ['api_data', 'api_slot_item', 'api_id'], -1);
      if (id < 0 || mst_id < 0) {
        return;
      }
      const mst = self.master.slotitem(mst_id);
      const data = {
        'api_id': id,
        'api_slotitem_id': mst_id,
        'api_locked': 0,
        'api_level': 0
      };
      const slotitem = new Slotitem(data, mst);
      self.slotitems.push(slotitem);
      const item = new CreatedSlotitem(mst, slotitem);
      self.emit('created_slotitem', item);
    } else {
      const fdata = _.get(json, ['api_data', 'api_fdata'], '2,-1').split(',').map((it) => parseInt(it, 10));
      const mst_id = _.get(fdata, [1], -1);
      const mst = self.master.slotitem(mst_id);
      if (!mst) {
        return;
      }
      const item = new CreatedSlotitem(mst, null);
      self.emit('created_slotitem', item);
    }
  });
}

DataStorage.prototype = Object.create(EventEmitter.prototype);

DataStorage.prototype.notify_port = function() {
  if (this.port) {
    this.emit('port', this.port);
  }
};

DataStorage.prototype.notify_questlist = function() {
  if (this.questlist) {
    this.emit('questlist', this.questlist);
  }
};

DataStorage.prototype.notify_ndock = function(ndock) {
  this.ndock = ndock;
  this.emit('ndock', ndock);
};

DataStorage.prototype.handle = function(api, params, response, port) {
  const func_name = 'handle_' + api.substring(4).replace(/\//g, '_');
  const func = this[func_name];

  if (typeof(func) == 'function') {
    func.call(this, params, response, port);
    return;
  }

  switch (api) {
    case 'api_get_member/ship3':
      this.handle_get_member_ship_deck(params, response, port);
      break;
    case 'api_req_sortie/battle':
    case 'api_req_sortie/ld_airbattle':
    case 'api_req_combined_battle/battle':
    case 'api_req_combined_battle/battle_water':
    case 'api_req_combined_battle/each_battle_water':
    case 'api_req_combined_battle/each_battle':
      this.handle_battle_started(params, response, port);
      break;
    default:
      console.trace('api not handled: api=' + api);
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
  const deck_id = parseInt(params.get('api_deck_id'), 10);
  const decks = port.sortie_decks(deck_id);

  const area = _.get(response, ['api_data', 'api_maparea_id'], -1);
  const map = _.get(response, ['api_data', 'api_mapinfo_no'], -1);
  const no = _.get(response, ['api_data', 'api_no'], -1);
  this._next_battle_cell = new BattleCell(area, map, no);

  decks.forEach((deck) => {
    deck.battle_cell = new DummyBattleCell(area, map, no);
  });

  this.notify_port();
  this.emit('sortie', {});
};

DataStorage.prototype.handle_req_map_next = function(params, response, port) {
  const area = _.get(response, ['api_data', 'api_maparea_id'], -1);
  const map = _.get(response, ['api_data', 'api_mapinfo_no'], -1);
  const no = _.get(response, ['api_data', 'api_no'], -1);

  const decks = port.decks.filter((deck) => {
    const battle_cell = deck.battle_cell;
    if (battle_cell == null) {
      return false;
    }
    return battle_cell.area == area && battle_cell.map == map;
  });

  const next_battle_cell = this._next_battle_cell;
  if (next_battle_cell != null) {
    decks.forEach((deck) => {
      deck.battle_cell = next_battle_cell;
    });
  }

  this._next_battle_cell = new BattleCell(area, map, no);
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
  deck.battle_cell = new PracticeBattleCell();
  this.notify_port();
};

DataStorage.prototype.handle_battle_started = function(params, response, port) {
  const next_battle_cell = this._next_battle_cell;
  if (next_battle_cell == null) {
    return;
  }
  const deck_id = _.get(response, ['api_data', 'api_deck_id'], -1);
  const decks = port.sortie_decks(deck_id);
  decks.forEach((deck) => {
    deck.battle_cell = next_battle_cell;
  });
  this._next_battle_cell = null;
  this.notify_port();
};

DataStorage.prototype.handle_req_kaisou_slot_deprive = function(params, response, port) {
  const list = [
    _.get(response, ['api_data', 'api_ship_data', 'api_unset_ship'], null),
    _.get(response, ['api_data', 'api_ship_data', 'api_set_ship'], null),
  ].filter((it) => it != null);

  list.forEach((data) => {
    const id =_.get(data, ['api_id'], -1);
    const ship = port.ship(id);
    if (!ship) {
      return;
    }
    ship.update(data);
  });

  this.notify_port();
};

DataStorage.prototype.handle_req_kaisou_slot_exchange_index = function(params, response, port) {
  const ship_id = parseInt(params.get('api_id'), 10);
  const ship = port.ship(ship_id);
  if (!ship) {
    return;
  }
  const slot = _.get(response, ['api_data', 'api_slot'], null);
  if (!slot) {
    return;
  }
  ship.update_slot(slot);
  this.notify_port();
};

DataStorage.prototype.handle_req_member_updatedeckname = function(params, response, port) {
  const deck_id = parseInt(params.get('api_deck_id'), 10);
  if (deck_id <= 0 || port.decks.length < deck_id) {
    return;
  }
  const deck = port.decks[deck_id - 1];
  const name = params.get('api_name');
  deck.set_name(name);
  this.notify_port();
};

DataStorage.prototype.handle_get_member_ndock = function(params, response, port) {
  const ndock_data = _.get(response, ['api_data'], []);
  const ndock = new NDock(ndock_data, port);
  this.notify_ndock(ndock);
};

DataStorage.prototype.handle_req_nyukyo_speedchange = function(params, response, port) {
  const ndock = this.ndock;
  if (!ndock) {
    return;
  }
  const ndock_id = parseInt(params.get('api_ndock_id'), 10);
  ndock.complete(ndock_id - 1);
  this.notify_ndock(ndock);

  const ndock_ships = ndock.ships();
  if (ndock_id <= 0 || ndock_ships.length <= ndock_id) {
    return;
  }
  const ndock_ship = ndock_ships[ndock_id - 1];
  const ship = ndock_ship.ship();
  if (!ship) {
    return;
  }
  ship.complete_repair();
  this.notify_port();
};

DataStorage.prototype.handle_req_nyukyo_start = function(params, response, port) {
  const highspeed = parseInt(params.get('api_highspeed'), 10) == 1;
  if (highspeed != 1) {
    return;
  }
  const ship_id = parseInt(params.get('api_ship_id'), 10);
  const ship = port.ship(ship_id);
  if (!ship) {
    return;
  }
  ship.complete_repair();
  this.notify_port();
};

DataStorage.prototype.handle_req_hensei_combined = function(params, response, port) {
  const type = parseInt(params.get('api_combined_type'), 10);
  port.set_combined_type(type);
  this.notify_port();
};

module.exports = DataStorage;
