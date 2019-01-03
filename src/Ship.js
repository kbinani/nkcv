'use strict;'

const _ = require('lodash'),
      Rat = require(__dirname + '/Rat.js'),
      SlotitemList = require(__dirname + '/SlotitemList.js'),
      ShipType = require(__dirname + '/ShipType.js'),
      Speed = require(__dirname + '/Speed.js'),
      SallyArea = require(__dirname + '/SallyArea.js'),
      util = require(__dirname + '/util.js'),
      json = require(__dirname + '/json.js');

const ship_class_mapping = json.fromFile(__dirname + '/../data/ship_class.hjson');

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

  ship_class() {
    return Ship.ship_class_from_name(this.name());
  }

  ship_class_order() {
    return Ship.ship_class_order_from_name(this.name());
  }

  _recover_hp(rate) {
    const current = this.hp();
    const next = Math.floor(current.numerator() * rate);
    this.set_hp(new Rat(next, current.denominator()));
  }

  // return: 実際にダメコンを消費したかどうか
  consume_damage_controller() {
    const current = this.hp();
    if (current.numerator() > 0) {
      return;
    }
    const ex = this.ex_slotitem();
    if (ex != null) {
      const rate = ex.hp_recovery_rate();
      if (rate > 0) {
        this._recover_hp(rate);
        _.set(this._data, ['api_slot_ex'], -1);
        return true;
      }
    }

    const slotitems = this.slotitems();
    for (let i = 0; i < slotitems.length; i++) {
      const item = slotitems[i];
      const rate = item.hp_recovery_rate();
      if (rate > 0) {
        this._recover_hp(rate);
        _.set(this._data, ['api_slot', i], -1);
        return true;
      }
    }

    return false;
  }

  static name_without_revise_postfix(name) {
    const suffixes = ['航改二', '乙改', '丁改', '改', ' due', ' zwei', ' drei', ' Mk.II'];
    for (let i = 0; i < suffixes.length; i++) {
      const suffix = suffixes[i];
      const idx = name.indexOf(suffix);
      if (idx >= 0) {
        return name.substring(0, idx);
      }
    }
    return name;
  }

  static original_ship_name(name_) {
    const name = Ship.name_without_revise_postfix(name_);
    const special_ship_names = {
      '龍鳳': '大鯨',
      '呂500': 'U-511',
      '千歳甲': '千歳',
      '千代田甲': '千代田',
      'Italia': 'Littorio',
      'Гангут два': 'Гангут',
      'Октябрьская революция': 'Гангут',
      '大鷹': '春日丸',
      'UIT-25': 'Luigi Torelli',
      '伊504': 'Luigi Torelli',
      'Верный': '響',
      '大鷹': '神鷹',
      '伊504': 'Luigi Torelli',
      'UIT-25': 'Luigi Torelli',
    };
    if (name in special_ship_names) {
      return special_ship_names[name];
    }
    return name;
  }

  static ship_class_from_name(name) {
    const original_name = Ship.original_ship_name(name);
    const klass = _.get(ship_class_mapping, [original_name, 'class'], null);
    if (klass == null) {
      return '(不明)';
    } else {
      return klass;
    }
  }

  static ship_class_order_from_name(name) {
    const original_name = Ship.original_ship_name(name);
    const order = _.get(ship_class_mapping, [original_name, 'order'], -1);
    if (order == -1) {
      return '';
    } else {
      return `${order}`;
    }
  }
}

module.exports = Ship;
