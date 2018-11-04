'use strict;'

const uuid = require('uuid/v4');

function QueryPreset(title, sql) {
  this.id = uuid();
  this.title = title;
  this.sql = sql;
}

QueryPreset.prototype.toJSON = function() {
  return {id: this.id, title: this.title, sql: this.sql};
};

QueryPreset.fromJSON = function(json) {
  const id = json["id"];
  const title = json["title"];
  const sql = json["sql"];
  const preset = new QueryPreset(title, sql);
  preset.id = id;
  return preset;
};

module.exports = QueryPreset;
