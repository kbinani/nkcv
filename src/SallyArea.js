'use strict;'

const _ = require('lodash');

function SallyArea(id) {
  this._id = id;
}

const mapping = require(__dirname + '/../data/sally_area.js');

SallyArea.prototype.name = function() {
  if (this._id == 0) {
    return '';
  }
  return _.get(mapping, [this._id, 'name'], this._id + '');
};

SallyArea.prototype.id = function() {
  return this._id;
}

SallyArea.prototype.background_color = function() {
  return _.get(mapping, [this._id, 'background-color'], "#444");
};

SallyArea.prototype.text_color = function() {
  return _.get(mapping, [this._id, 'text-color'], 'white');
};

SallyArea.load_remote_mapping = function() {
  const url = 'https://gist.githubusercontent.com/kbinani/ac6e84a846385537f951c362b8b2f8c4/raw/sally_area.hjson';
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

module.exports = SallyArea;
