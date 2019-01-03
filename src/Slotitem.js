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

const mapping = {
  1: {
    name: "small_caliber_main_gun",
    title: "小口径主砲",
  },
  2: {
    name: "medium_caliber_main_gun",
    title: "中口径主砲",
  },
  3: {
    name: "large_caliber_main_gun",
    title: "大口径主砲",
  },
  4: {
    name: "secondary_gun",
    title: "副砲",
  },
  5: {
    name: "torpedo",
    title: "魚雷",
  },
  6: {
    name: "carrier-based_fighter_aircraft",
    title: "艦上戦闘機",
  },
  7: {
    name: "carrier-based_dive_bomber",
    title: "艦上爆撃機",
  },
  8: {
    name: "carrier-based_torpedo_bomber",
    title: "艦上攻撃機",
  },
  9: {
    name: "carrier-based_reconnaissance_aircraft",
    title: "艦上偵察機",
  },
  10: {
    name: "reconnaissance_seaplane",
    title: "水上偵察機",
  },
  11: {
    name: "seaplane_bomber",
    title: "水上爆撃機",
  },
  12: {
    name: "small_radar",
    title: "小型電探",
  },
  13: {
    name: "large_radar",
    title: "大型電探",
  },
  14: {
    name: "sonar",
    title: "ソナー",
  },
  15: {
    name: "depth_charge",
    title: "爆雷",
  },
  16: {
    name: "",
    title: "追加装甲",
  },
  17: {
    name: "engine_improvement",
    title: "機関部強化",
  },
  18: {
    name: "anti-aircraft_shell",
    title: "対空強化弾",
  },
  19: {
    name: "armor_piercing_shell",
    title: "対艦強化弾",
  },
  20: {
    name: "",
    title: "VT信管",
  },
  21: {
    name: "anti-aircraft_gun",
    title: "対空機銃",
  },
  22: {
    name: "midget_submarine",
    title: "特殊潜航艇",
  },
  23: {
    name: "emergency_repair_personnel",
    title: "応急修理要員",
  },
  24: {
    name: "landing_craft",
    title: "上陸用舟艇",
  },
  25: {
    name: "autogyro",
    title: "オートジャイロ",
  },
  26: {
    name: "anti-submarine_patrol_aircraft",
    title: "対潜哨戒機",
  },
  27: {
    name: "extra_armor_(medium)",
    title: "追加装甲(中型)",
  },
  28: {
    name: "extra_armor_(large)",
    title: "追加装甲(大型)",
  },
  29: {
    name: "searchlight",
    title: "探照灯",
  },
  30: {
    name: "supply_transport_container",
    title: "簡易輸送部材",
  },
  31: {
    name: "ship_repair_facility",
    title: "艦艇修理施設",
  },
  32: {
    name: "submarine_torpedo",
    title: "潜水艦魚雷",
  },
  33: {
    name: "star_shell",
    title: "照明弾",
  },
  34: {
    name: "command_facility",
    title: "司令部施設",
  },
  35: {
    name: "aviation_personnel",
    title: "航空要員",
  },
  36: {
    name: "anti-aircraft_fire_director",
    title: "高射装置",
  },
  37: {
    name: "anti-ground_equipment",
    title: "対地装備",
  },
  38: {
    name: "large_caliber_main_gun_(II)",
    title: "大口径主砲（II）",
  },
  39: {
    name: "surface_ship_personnel",
    title: "水上艦要員",
  },
  40: {
    name: "large_sonar",
    title: "大型ソナー",
  },
  41: {
    name: "large_flying_boat",
    title: "大型飛行艇",
  },
  42: {
    name: "large_searchlight",
    title: "大型探照灯",
  },
  43: {
    name: "combat_ration",
    title: "戦闘糧食",
  },
  44: {
    name: "supplies",
    title: "補給物資",
  },
  45: {
    name: "seaplane_fighter",
    title: "水上戦闘機",
  },
  46: {
    name: "special_amphibious_tank",
    title: "特型内火艇",
  },
  47: {
    name: "land-based_attack_aircraft",
    title: "陸上攻撃機",
  },
  48: {
    name: "land-based_fighter",
    title: "局地戦闘機",
  },
  50: {
    name: "transportation_material",
    title: "輸送機材",
  },
  51: {
    name: "submarine_equipment",
    title: "潜水艦装備",
  },
  56: {
    name: "",
    title: "噴式戦闘機",
  },
  57: {
    name: "jet-powered_fighter-bomber",
    title: "噴式戦闘爆撃機",
  },
  58: {
    name: "",
    title: "噴式攻撃機",
  },
  59: {
    name: "",
    title: "噴式偵察機",
  },
  93: {
    name: "large_radar_(II)",
    title: "大型電探（II）",
  },
  94: {
    name: "carrier-based_reconnaissance_aircraft_(II)",
    title: "艦上偵察機（II）",
  },
};

Slotitem.prototype.type = function() {
  const type = _.get(this._master_data, ['api_type', 2], -1);
  const name = _.get(mapping, [type, 'name'], '');
  if (name.length == 0) {
    return '' + type;
  } else {
    return name;
  }
};

Slotitem.prototype.icon_type = function() {
  return _.get(this._master_data, ['api_type', 3], -1);
};

Slotitem.prototype.level = function() {
  // 改修レベル
  return _.get(this._data, ['api_level'], 0);
};

Slotitem.prototype.level_description = function() {
  const level = this.level();
  if (level <= 0) {
    return '';
  }
  if (level == 10) {
    return '★max';
  } else {
    return '★' + level;
  }
};

Slotitem.prototype.proficiency = function() {
  // 熟練度
  return _.get(this._data, ['api_alv'], 0);
};

Slotitem.prototype.taiku = function() {
  return _.get(this._master_data, ['api_tyku'], 0);
};

Slotitem.prototype.sakuteki = function() {
  return _.get(this._master_data, ['api_saku'], 0);
};

Slotitem.prototype.sakuteki_coefficient = function() {
  const type = _.get(this._master_data, ['api_type', 2], -1);
  const title = _.get(mapping, [type, 'title'], '');
  const coeff_mapping = {
    "艦上戦闘機": 0.6,
    "艦上爆撃機": 0.6,
    "艦上攻撃機": 0.8,
    "艦上偵察機": 1,
    "艦上偵察機（II）": 1,
    "水上偵察機": 1.2,
    "水上爆撃機": 1.1,
    "水上戦闘機": 0.6,
    "噴式戦闘爆撃機": 0.6,
    "夜間戦闘機": 0.6,
    "夜間攻撃機": 0.8,
    "大型飛行艇": 0.6,
    "対潜哨戒機": 0.6,
    "小型電探": 0.6,
    "大型電探": 0.6,
    "大型電探（II）": 0.6,
    "潜水艦装備": 0.6,
    "探照灯": 0.6,
    "大型探照灯": 0.6,
    "司令部施設": 0.6,
    "航空要員": 0.6,
    "水上艦要員": 0.6,
    "大型ソナー": 0.6,
    "魚雷": 0.6,
  };
  return _.get(coeff_mapping, [title], 0);
};

Slotitem.prototype.sakuteki_proficiency_coefficient = function() {
  const type = _.get(this._master_data, ['api_type', 2], -1);
  const title = _.get(mapping, [type, 'title'], '');
  const coeff_mapping = {
    "小型電探": 1.25,
    "大型電探": 1.4,
    "水上偵察機": 1.2,
    "艦上偵察機（II）": 1.2,
    "水上爆撃機": 1.15,
  };
  return _.get(coeff_mapping, [title], 0);
};

Slotitem.prototype.hp_recovery_rate = function() {
  const name = this.name();
  switch (this.name()) {
    case '応急修理要員':
      return 0.2;
    case '応急修理女神':
      return 1;
    default:
      return 0;
  }
};

module.exports = Slotitem;
