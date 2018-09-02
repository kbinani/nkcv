'use strict;'

const _ = require('lodash');

function Slotitem(data, masterData) {
  this._data = data;
  this._master_data = masterData;
}

Slotitem.prototype.id = function() {
  return _.get(this._data, ['api_id'], -1);
};

Slotitem.prototype.name = function() {
  return _.get(this._master_data, ['api_name'], '');
};

Slotitem.prototype.type = function() {
  const type = _.get(this._master_data, ['api_type', 3], -1);
  const mapping = {
    1: "main_canon_light",
    2: "main_canon_medium",
    3: "main_canon_heavy",
    4: "secondary_gun",
    5: "torpedo",
    6: "fighter",
    7: "dive_bomber",
    8: "torpedo_bomber",
    9: "recon_plane",
    10: "recon_seaplane",
    11: "radar",
    12: "anti_aircraft_shell", // 三式弾
    13: "armor_piercing_shell", // 徹甲弾
    14: "emergency_repair",
    15: "anti_aircraft_gun",
    16: "high_angle_gun",
    17: "depth_charge", // 爆雷投射機
    18: "sonar",
    19: "engine_equipment",
    20: "landing_craft", // 上陸用舟艇
    21: "autogyro",
    22: "artillery_spotter", // 指揮連絡機
    23: "expansion_bulge", // 増設バルジ
    24: "searchlight",
    25: "drum_canister", // ドラム缶
    26: "facility", // 修理施設
    27: "flare", // 照明弾
    28: "command_facility", // 司令部施設
    29: "maintenance_personnel", // 航空要員
    30: "anti_aircraft_fire_director", // 射撃管制装置
    31: "anti_ground_artillery", // 対地ロケラン
    32: "surface_ship_personnel", // 水上艦要員
    33: "flying_boat", // 大型飛行艇
    34: "combat_rations", // 戦闘糧食
    35: "supplies", // 洋上補給
    36: "amphibious_tank", // 内火艇
    37: "land_based_attacker", // 陸上攻撃機
    38: "interceptor_fighter", // 局地戦闘機
    39: "jet_powereded_bomber1", // 墳式戦闘爆撃機
    40: "jet_powereded_bomber2",
    41: "transport_equipment", // 輸送機材
    42: "submarine_equipment",
    43: "seaplane_fighter", // 水上戦闘機
    44: "land_based_fighter", // 陸軍戦闘機
    45: "night_fighter", // 夜間戦闘機
    46: "night_attacker", // 夜間攻撃機
    47: "land_based_anti_submarine_attacker", // 陸上対潜機
  };
  return _.get(mapping, [type], "unknown");
};

Slotitem.prototype.level = function() {
  // 改修レベル
  return _.get(this._data, ['api_level'], 0);
};

Slotitem.prototype.proficiency = function() {
  // 熟練度
  return _.get(this._data, ['api_alv'], 0);
};

module.exports = Slotitem;
