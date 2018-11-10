'use strict;'

const _ = require('lodash'),
      uuid = require('uuid/v4');
const QueryPreset = require(__dirname + '/QueryPreset.js');

function QueryPresetList(json) {
  this.list = {};
  this.onChange = null;
  this.patch(json);
}

QueryPresetList.prototype.patch = function(json) {
  for (var id in json) {
    const preset = QueryPreset.fromJSON(json[id]);
    if (id != preset.id) {
      continue;
    }
    this.list[id] = preset;
  }
  this.ensureBuiltinPresets();
  this._notify();
};

QueryPresetList.prototype.toJSON = function() {
  this.ensureBuiltinPresets();
  return JSON.parse(JSON.stringify(this.list));
};

const builtin = [
  {
    'id': 'c08f5824-57a7-4d6e-b66e-f8d3774a2f00',
    'title': '明石さん修理可能な艦娘',
    'sql': 'hp / maxhp > 0.5 and is_mission = false and repair_seconds > 0 order by repair_seconds desc'
  }
];

QueryPresetList.prototype.ensureBuiltinPresets = function() {
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

QueryPresetList.prototype.isBuiltin = function(id) {
  return _.findIndex(builtin, (it) => it.id == id) >= 0;
};

QueryPresetList.prototype.remove = function(id) {
  if (this.isBuiltin(id)) {
    return;
  }
  if (!(id in this.list)) {
    return;
  }
  delete(this.list[id]);
  this._notify();
};

QueryPresetList.prototype.append = function(title, sql) {
  const preset = new QueryPreset(title, sql);
  this.list[preset.id] = preset;
  this._notify();
  return preset.id;
};

QueryPresetList.prototype._notify = function() {
  if (typeof(this.onChange) == 'function') {
    this.onChange();
  }
};

module.exports = QueryPresetList;
