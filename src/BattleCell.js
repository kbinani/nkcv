'use strict;'

const https = require('https'),
      HJSON = require('hjson'),
      _ = require('lodash');

const mapping = require(__dirname + '/../data/battle_cell_mapping.js');

function BattleCell(area, map, cell) {
  this.area = area;
  this.map = map;
  this.cell = cell;
}

BattleCell.prototype.name = function() {
  const name = _.get(mapping, [this.area, this.map, this.cell], this.cell);
  return [this.area, this.map, name].join('-');
};

BattleCell.load_remote_mapping = function() {
  const url = 'https://gist.githubusercontent.com/kbinani/ac6e84a846385537f951c362b8b2f8c4/raw/kc_map_cell_name.hjson';
  const req = https.request(url, (res) => {
    var body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', (res) => {
      const data = HJSON.parse(body);
      Object.assign(mapping, data);
    });
  });
  req.on('error', (e) => {
    console.trace(e);
  });
  req.end();
};

module.exports = BattleCell;
