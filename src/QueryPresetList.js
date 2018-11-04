'use strict;'

const QueryPreset = require(__dirname + '/QueryPreset.js');

function QueryPresetList(json) {
  this.list = {};
  this.onChange = null;
  this.patch(json);
}

QueryPresetList.prototype.patch = function(json) {
  for (var id in json) {
    const preset = QueryPreset.fromJSON(json);
    if (id != preset.id) {
      continue;
    }
    this.list[id] = preset;
  }
  this.ensureBuiltinPresets();
};

QueryPresetList.prototype.toJSON = function() {
  this.ensureBuiltinPresets();
  return JSON.parse(JSON.stringify(this.list));
};

QueryPresetList.prototype.ensureBuiltinPresets = function() {
  const builtin = [
    {
      'id': 'c08f5824-57a7-4d6e-b66e-f8d3774a2f00',
      'title': '明石さん修理可能な艦娘',
      'sql': 'hp / maxhp >= 0.5 and is_mission = false and repair_seconds > 0 order by repair_seconds desc'
    }
  ];
  builtin.forEach((it) => {
    const preset = QueryPreset.fromJSON(it);
    this.list[preset.id] = preset;
  });
};

QueryPresetList.prototype.presetById = function(id) {
  if (id in this.list) {
    return this.list[id];
  } else {
    return null;
  }
};

module.exports = QueryPresetList;
