'use strict;'

const https = require('https'),
      HJSON = require('hjson'),
      _ = require('lodash'),
      is_dev = require('electron-is-dev'),
      fs = require('fs');
const Notification = require(__dirname + '/Notification.js');

const mapping = require(__dirname + '/../data/battle_cell_mapping.js');

function BattleCell(area, map, cell) {
  this.area = area;
  this.map = map;
  this.cell = cell;
}

BattleCell.prototype.name = function() {
  const area_name = _.get(mapping, [this.area, 'name'], this.area + '-');
  const name = _.get(mapping, [this.area, this.map, this.cell], this.cell);
  if (is_dev && name == this.cell + "") {
    Notification.show("セル名が未設定です. " + area_name + this.map + "-" + this.cell);
  }
  return area_name + this.map + '-' + name;
};

BattleCell.load_remote_mapping = function() {
  try {
    const local_file_path = __dirname + '/../data/battle_cell_mapping.js';
    const buffer = fs.readFileSync(local_file_path);
    const local = JSON.parse(buffer);
    _.merge(mapping, local);
  } catch (e) {
    console.trace(e);
  }

  const url = 'https://gist.githubusercontent.com/kbinani/ac6e84a846385537f951c362b8b2f8c4/raw/kc_map_cell_name.hjson';
  const req = https.request(url, (res) => {
    var body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', (res) => {
      const data = HJSON.parse(body);
      _.merge(mapping, data);
    });
  });
  req.on('error', (e) => {
    console.trace(e);
  });
  req.end();
};

module.exports = BattleCell;
