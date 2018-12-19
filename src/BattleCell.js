'use strict;'

const https = require('https'),
      HJSON = require('hjson'),
      _ = require('lodash'),
      is_dev = require('electron-is-dev'),
      fs = require('fs');
const Notification = require(__dirname + '/Notification.js');

const mapping = {};

class BattleCell {
  constructor(area, map, cell) {
    this.area = area;
    this.map = map;
    this.cell = cell;
  }

  name() {
    const area_name = _.get(mapping, [this.area, 'name'], this.area + '-');
    const name = _.get(mapping, [this.area, this.map, this.cell], this.cell);
    if (is_dev && name == `${this.cell}`) {
      Notification.show(`セル名が未設定です. ${area_name}${this.map}-${this.cell}`);
    }
    return `${area_name}${this.map}-${name}`;
  }

  static load_remote_mapping() {
    this.load_local_mapping();

    const url = 'https://gist.githubusercontent.com/kbinani/ac6e84a846385537f951c362b8b2f8c4/raw/kc_map_cell_name.hjson';
    const req = https.request(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', (res) => {
        const data = HJSON.parse(body);
        _.merge(mapping, data);
        if (is_dev) {
          this.load_local_mapping();
        }
      });
    });
    req.on('error', (e) => {
      console.trace(e);
    });
    req.end();
  }

  static load_local_mapping() {
    try {
      const local_file_path = __dirname + '/../data/battle_cell_mapping.hjson';
      const buffer = fs.readFileSync(local_file_path);
      const local = HJSON.parse(buffer.toString());
      _.merge(mapping, local);
    } catch (e) {
      console.trace(e);
    }
  }
}

module.exports = BattleCell;
