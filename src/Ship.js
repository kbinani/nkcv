'use strict;'

const _ = require('lodash'),
      Rat = require(__dirname + '/Rat.js'),
      SlotitemList = require(__dirname + '/SlotitemList.js'),
      ShipType = require(__dirname + '/ShipType.js'),
      Speed = require(__dirname + '/Speed.js'),
      SallyArea = require(__dirname + '/SallyArea.js');

function Ship(data, master_data, storage) {
  this._data = data;
  this._master_data = master_data;
  this._storage = storage;
  this._is_mission = false;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

Ship.prototype.clone = function() {
  const ship = new Ship(clone(this._data), this._master_data, this._storage);
  ship._is_mission = this._is_mission;
  return ship;
};

Ship.prototype.toString = function() {
  return this.name() + '(' + this.hp() + ')';
};

Ship.prototype.id = function() {
  return _.get(this._data, ['api_id'], 0);
};

Ship.prototype.name = function() {
  return _.get(this._master_data, ['api_name'], '');
};

Ship.prototype.level = function() {
  return _.get(this._data, ['api_lv'], 0);
};

Ship.prototype.hp = function() {
  const nowhp = _.get(this._data, ['api_nowhp'], 0);
  const maxhp = _.get(this._data, ['api_maxhp'], 0);
  if (maxhp <= 0) {
    return null;
  }
  return new Rat(nowhp, maxhp);
};

Ship.prototype.set_hp = function(hp) {
  _.set(this._data, ['api_nowhp'], hp.numerator());
  _.set(this._data, ['api_maxhp'], hp.denominator());
};

Ship.prototype.cond = function() {
  return _.get(this._data, ['api_cond'], 0);
};

Ship.prototype.exp = function() {
  return _.get(this._data, ['api_exp', 0], 0);
};

Ship.prototype.next_exp = function() {
  return _.get(this._data, ['api_exp', 1], 0);
};

Ship.prototype.fuel = function() {
  const fuel = _.get(this._data, ['api_fuel'], 0);
  const fuel_max = _.get(this._master_data, ['api_fuel_max'], 0);
  return new Rat(fuel, fuel_max);
};

Ship.prototype.set_fuel = function(fuel) {
  _.set(this._data, ['api_fuel'], fuel);
};

Ship.prototype.bull = function() {
  const bull = _.get(this._data, ['api_bull'], 0);
  const bull_max = _.get(this._master_data, ['api_bull_max'], 0);
  return new Rat(bull, bull_max);
};

Ship.prototype.set_bull =  function(bull) {
  _.set(this._data, ['api_bull'], bull);
};

Ship.prototype.karyoku = function() {
  const value = _.get(this._data, ['api_karyoku', 0], 0);
  const max = _.get(this._data, ['api_karyoku', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.raisou = function() {
  const value = _.get(this._data, ['api_raisou', 0], 0);
  const max = _.get(this._data, ['api_raisou', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.taiku = function() {
  const value = _.get(this._data, ['api_taiku', 0], 0);
  const max = _.get(this._data, ['api_taiku', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.soukou = function() {
  const value = _.get(this._data, ['api_soukou', 0], 0);
  const max = _.get(this._data, ['api_soukou', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.kaihi = function() {
  const value = _.get(this._data, ['api_kaihi', 0], 0);
  const max = _.get(this._data, ['api_kaihi', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.taisen = function() {
  const value = _.get(this._data, ['api_taisen', 0], 0);
  const max = _.get(this._data, ['api_taisen', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.sakuteki = function() {
  const value = _.get(this._data, ['api_sakuteki', 0], 0);
  const max = _.get(this._data, ['api_sakuteki', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.lucky = function() {
  const value = _.get(this._data, ['api_lucky', 0], 0);
  const max = _.get(this._data, ['api_lucky', 1], 1);
  return new Rat(value, max);
};

Ship.prototype.soku = function() {
  const value = _.get(this._data, ['api_soku'], 0);
  return new Speed(value);
};

Ship.prototype.repair_seconds = function() {
  const value = _.get(this._data, ['api_ndock_time'], 0);
  return value;
}

Ship.prototype.complete_repair = function() {
  _.set(this._data, ['api_ndock_time'], 0);
  const maxhp = _.get(this._data, ['api_maxhp'], 0);
  _.set(this._data, ['api_nowhp'], maxhp);
};

Ship.prototype.type = function() {
  const stype = _.get(this._master_data, ['api_stype'], -1);
  return new ShipType(stype);
};

Ship.prototype.slotitems = function() {
  const items = _.get(this._data, ['api_slot'], []);
  const self = this;
  return items.map(function(it) {
    if (it <= 0) {
      return null;
    }
    return self._storage.slotitems.slotitem(it);
  }).filter(function(it) { return it != null; });
};

Ship.prototype.ex_slotitem = function() {
  const id = _.get(this._data, ['api_slot_ex'], -1);
  if (id < 0) {
    return null;
  }
  return this._storage.slotitems.slotitem(id);
};

Ship.prototype.locked = function() {
  return _.get(this._data, ['api_locked'], 1) == 1;
};

Ship.prototype.after_level = function() {
  return _.get(this._master_data, ['api_afterlv'], 0);
};

Ship.prototype.is_mission = function() {
  return this._is_mission;
};

Ship.prototype.set_mission = function(flag) {
  this._is_mission = flag;
};

Ship.prototype.remodel_completed = function() {
  const karyoku = this.karyoku();
  const raisou = this.raisou();
  const taiku = this.taiku();
  const soukou = this.soukou();
  const lucky = this.lucky();
  const taisen = this.taisen();
  return karyoku.value() >= 1 &&
    raisou.value() >= 1 &&
    taiku.value() >= 1 &&
    soukou.value() >= 1 &&
    lucky.value() >= 1 &&
    taisen.value() >= 1;
};

Ship.prototype.update = function(data) {
  this._data = data;
};

Ship.prototype.update_slot = function(data) {
  _.set(this._data, ['api_slot'], data);
};

Ship.prototype.maxeq = function() {
  return _.get(this._master_data, ['api_maxeq'], [0, 0, 0, 0, 0]);
};

Ship.prototype.onslot = function() {
  return _.get(this._data, ['api_onslot'], [0, 0, 0, 0, 0]);
};

Ship.prototype.sally_area = function() {
  const id = _.get(this._data, ['api_sally_area'], 0);
  return new SallyArea(id);
};

module.exports = Ship;
