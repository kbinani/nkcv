'use strict;'

const _ = require('lodash');
const Rat = require(__dirname + '/Rat.js'),
      Ship = require(__dirname + '/Ship.js');

class BattleRunner {
  constructor(storage) {
    this._storage = storage;
    this._enemies = [];
    this._midnight = false;
  }

  append(api, data) {
    switch (api) {
      case 'api_req_sortie/battle':
        this.battle(data);
        break;
    }
  }

  // api_req_sortie/battle
  battle(api_data) {
    this._battle(api_data);
  }

  midnight_battle(api_data) {
    this._battle(api_data);
  }

  _battle(api_data) {
    if (this._enemies.length == 0) {
      // 敵艦の HP 初期値を取得
      const nowhps = _.get(api_data, ["api_data", "api_e_nowhps"], []);
      const maxhps = _.get(api_data, ["api_data", "api_e_maxhps"], []);
      const enemy_ship_ids = _.get(api_data, ['api_data', 'api_ship_ke'], []);
      if (nowhps.length == maxhps.length && nowhps.length == enemy_ship_ids.length) {
        for (var i = 0; i < nowhps.length; i++) {
          const ship_id = enemy_ship_ids[i];
          const nowhp = nowhps[i];
          const maxhp = maxhps[i];
          const data = {
            api_nowhp: nowhp,
            api_maxhp: maxhp,
          };
          const master = this._storage.master.ship(ship_id);
          const enemy = new Ship(data, master, this.storage);
          this._enemies.push(enemy);
        }
      }
    }

    // 夜戦の必要があるかどうか
    this._midnight = _.get(api_data, ['api_data', 'api_midnight_flag'], 0) != 0;

    // 開幕航空戦
    const kouku_edam = _.get(api_data, ["api_data", "api_kouku", "api_stage3", "api_edam"], []);
    for (var i = 0; i < kouku_edam.length; i++) {
      const edam = kouku_edam[i];
      this._edam(i, edam);
    }

    // 開幕対潜
    if (_.get(api_data, ['api_data', 'api_opening_taisen_flag'], 0) != 0) {
      const attack = _.get(api_data, ['api_data', 'api_opening_taisen'], null);
      if (attack != null) {
        this._step(attack);
      }
    }

    // 開幕雷撃
    const opening_attack_edam = _.get(api_data, ["api_data", "api_opening_atack", "api_edam"], []);
    for (var i = 0; i < opening_attack_edam.length; i++) {
      const edam = opening_attack_edam[i];
      this._edam(i, edam);
    }

    // 砲雷戦

    const hourai_flag = _.get(api_data, ["api_data", "api_hourai_flag"], []);
    const hourai_key_map = ["api_hougeki1", "api_hougeki2", "api_hougeki3", "api_raigeki"];
    for (var i = 0; i < 3; i++) {
      if (hourai_flag.length <= i) {
        break;
      }
      const flag = hourai_flag[i];
      if (flag != 1) {
        continue;
      }
      const key = hourai_key_map[i];
      const attack = _.get(api_data, ["api_data", key], []);
      this._step(attack);
    }
    do {
      const i = 3;
      if (hourai_flag.length <= i) {
        break;
      }
      const flag = hourai_flag[i];
      if (flag != 1) {
        break;
      }
      const key = hourai_key_map[i];
      const attack = _.get(api_data, ["api_data", key], []);
      const damage = _.get(attack, ["api_edam"], []);
      for (var j = 0; j < damage.length; j++) {
        const edam = damage[j];
        this._edam(j, edam);
      }
    } while(false);
  }

  _step(attack) {
    const at_eflag = _.get(attack, ["api_at_eflag"], []);
    const df_list = _.get(attack, ["api_df_list"], []);
    const damage = _.get(attack, ["api_damage"], []);
    const count = at_eflag.length;
    if (df_list.length != count || damage.length != count) {
      return;
    }
    for (var j = 0; j < count; j++) {
      // at_eflag[j] = 0 なら自軍、1なら敵軍の攻撃
      if (at_eflag[j] != 0) {
        continue;
      }
      const index_list = df_list[j];
      const damage_list = damage[j];
      if (index_list.length != damage_list.length) {
        continue;
      }
      for (var k = 0; k < index_list.length; k++) {
        const index = index_list[k];
        const edam = damage_list[k];
        this._edam(index, edam);
      }
    }
  }

  _edam(index, amount) {
    if (typeof(amount) != 'number') {
      return;
    }
    if (amount <= 0) {
      return;
    }
    if (index < 0 || this._enemies.length <= index) {
      return;
    }
    const enemy = this._enemies[index];
    const current_hp = enemy.hp();
    const next = Math.max(0, current_hp.numerator() - Math.floor(amount));
    enemy.set_hp(new Rat(next, current_hp.denominator()));
  }

  // api_req_sortie/ld_airbattle
  ld_airbattle(api_data) {

  }

  // api_req_combined_battle/ec_battle
  ec_battle(api_data) {

  }

  // api_req_combined_battle/ec_midnight_battle
  ec_midnight_battle(api_data) {

  }

  // 敵艦のリストを返す。[Ship]
  enemies() {
    return this._enemies;
  }

  is_midnight_planned() {
    return this._midnight;
  }
}

module.exports = BattleRunner;
