'use strict;'

const _ = require('lodash'),
      Rat = require(__dirname + '/Rat.js'),
      SlotitemList = require(__dirname + '/SlotitemList.js'),
      ShipType = require(__dirname + '/ShipType.js'),
      Speed = require(__dirname + '/Speed.js'),
      SallyArea = require(__dirname + '/SallyArea.js'),
      util = require(__dirname + '/util.js');

class Ship {
  constructor(data, master_data, storage) {
    this._data = data;
    this._master_data = master_data;
    this._storage = storage;
    this._is_mission = false;
  }

  clone() {
    const ship = new Ship(util.clone(this._data), this._master_data, this._storage);
    ship._is_mission = this._is_mission;
    return ship;
  }

  toString() {
    return this.name() + '(' + this.hp() + ')';
  }

  id() {
    return _.get(this._data, ['api_id'], 0);
  }

  name() {
    return _.get(this._master_data, ['api_name'], '');
  }

  level() {
    return _.get(this._data, ['api_lv'], 0);
  }

  hp() {
    const nowhp = _.get(this._data, ['api_nowhp'], 0);
    const maxhp = _.get(this._data, ['api_maxhp'], 0);
    if (maxhp <= 0) {
      return null;
    }
    return new Rat(nowhp, maxhp);
  }

  set_hp(hp) {
    _.set(this._data, ['api_nowhp'], hp.numerator());
    _.set(this._data, ['api_maxhp'], hp.denominator());
  }

  cond() {
    return _.get(this._data, ['api_cond'], 0);
  }

  exp() {
    return _.get(this._data, ['api_exp', 0], 0);
  }

  next_exp() {
    return _.get(this._data, ['api_exp', 1], 0);
  }

  fuel() {
    const fuel = _.get(this._data, ['api_fuel'], 0);
    const fuel_max = _.get(this._master_data, ['api_fuel_max'], 0);
    return new Rat(fuel, fuel_max);
  }

  set_fuel(fuel) {
    _.set(this._data, ['api_fuel'], fuel);
  }

  bull() {
    const bull = _.get(this._data, ['api_bull'], 0);
    const bull_max = _.get(this._master_data, ['api_bull_max'], 0);
    return new Rat(bull, bull_max);
  }

  set_bull(bull) {
    _.set(this._data, ['api_bull'], bull);
  }

  karyoku() {
    const value = _.get(this._data, ['api_karyoku', 0], 0);
    const max = _.get(this._data, ['api_karyoku', 1], 1);
    return new Rat(value, max);
  }

  raisou() {
    const value = _.get(this._data, ['api_raisou', 0], 0);
    const max = _.get(this._data, ['api_raisou', 1], 1);
    return new Rat(value, max);
  }

  taiku() {
    const value = _.get(this._data, ['api_taiku', 0], 0);
    const max = _.get(this._data, ['api_taiku', 1], 1);
    return new Rat(value, max);
  }

  soukou() {
    const value = _.get(this._data, ['api_soukou', 0], 0);
    const max = _.get(this._data, ['api_soukou', 1], 1);
    return new Rat(value, max);
  }

  kaihi() {
    const value = _.get(this._data, ['api_kaihi', 0], 0);
    const max = _.get(this._data, ['api_kaihi', 1], 1);
    return new Rat(value, max);
  }

  taisen() {
    const value = _.get(this._data, ['api_taisen', 0], 0);
    const max = _.get(this._data, ['api_taisen', 1], 1);
    return new Rat(value, max);
  }

  sakuteki() {
    const value = _.get(this._data, ['api_sakuteki', 0], 0);
    const max = _.get(this._data, ['api_sakuteki', 1], 1);
    return new Rat(value, max);
  }

  lucky() {
    const value = _.get(this._data, ['api_lucky', 0], 0);
    const max = _.get(this._data, ['api_lucky', 1], 1);
    return new Rat(value, max);
  }

  soku() {
    const value = _.get(this._data, ['api_soku'], 0);
    return new Speed(value);
  }

  repair_seconds() {
    const value = _.get(this._data, ['api_ndock_time'], 0);
    return value / 1000.0;
  }

  complete_repair() {
    _.set(this._data, ['api_ndock_time'], 0);
    const maxhp = _.get(this._data, ['api_maxhp'], 0);
    _.set(this._data, ['api_nowhp'], maxhp);
  }

  type() {
    const stype = _.get(this._master_data, ['api_stype'], -1);
    return new ShipType(stype);
  }

  slotitems() {
    const items = _.get(this._data, ['api_slot'], []);
    const self = this;
    return items.map((it) => {
      if (it <= 0) {
        return null;
      }
      return self._storage.slotitems.slotitem(it);
    }).filter((it) => { return it != null; });
  }

  ex_slotitem() {
    const id = _.get(this._data, ['api_slot_ex'], -1);
    if (id < 0) {
      return null;
    }
    return this._storage.slotitems.slotitem(id);
  }

  locked() {
    return _.get(this._data, ['api_locked'], 1) == 1;
  }

  after_level() {
    return _.get(this._master_data, ['api_afterlv'], 0);
  }

  is_mission() {
    return this._is_mission;
  }

  set_mission(flag) {
    this._is_mission = flag;
  }

  remodel_completed() {
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
  }

  update(data) {
    this._data = data;
  }

  update_slot(data) {
    _.set(this._data, ['api_slot'], data);
  }

  maxeq() {
    return _.get(this._master_data, ['api_maxeq'], [0, 0, 0, 0, 0]);
  }

  onslot() {
    return _.get(this._data, ['api_onslot'], [0, 0, 0, 0, 0]);
  }

  sally_area() {
    const id = _.get(this._data, ['api_sally_area'], 0);
    return new SallyArea(id);
  }
}

module.exports = Ship;
