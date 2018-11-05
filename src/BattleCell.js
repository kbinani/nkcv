'use strict;'

const https = require('https'),
      HJSON = require('hjson'),
      _ = require('lodash');

const mapping = require(__dirname + '/../data/battle_cell_mapping.js');

function _assign(data) {
  for (var area in data) {
    for (var map in data[area]) {
      for (var cell in data[area][map]) {
        const name = data[area][map][cell];
        _.set(mapping, [area, map, cell], name);
      }
    }
  }
};

function BattleCell(area, map, cell) {
  this.area = area;
  this.map = map;
  this.cell = cell;
}

BattleCell.prototype.name = function() {
  const area_name = _.get(mapping, [this.area, 'name'], this.area + '-');
  const name = _.get(mapping, [this.area, this.map, this.cell], this.cell);
  return area_name + this.map + '-' + name;
};

BattleCell.load_remote_mapping = function() {
  const local = require(__dirname + '/../data/battle_cell_mapping.js');
  _assign(local);

  const url = 'https://gist.githubusercontent.com/kbinani/ac6e84a846385537f951c362b8b2f8c4/raw/kc_map_cell_name.hjson';
  const req = https.request(url, (res) => {
    var body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', (res) => {
      const data = HJSON.parse(body);
      _assign(data);
    });
  });
  req.on('error', (e) => {
    console.trace(e);
  });
  req.end();
};

module.exports = BattleCell;
