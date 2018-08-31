'use strict;'

const _ = require('lodash'),
      Quest = require(__dirname + '/Quest.js');

function QuestList() {
  this._data = [];
}

QuestList.prototype.update = function(data) {
  const count = _.get(data, ['api_data', 'api_count'], -1);
  if (count < 0) {
    return;
  }
  const delta = count - this._data.length;
  if (delta > 0) {
    for (var i = 0; i < delta; i++) {
      this._data.push(null);
    }
  } else if (delta < 0) {
    this._data.splice(this._data.length + delta, -delta);
  }

  const page = _.get(data, ['api_data', 'api_disp_page'], -1);
  if (page < 0) {
    return;
  }
  const list = _.get(data, ['api_data', 'api_list'], []);
  for (var i = 0; i < list.length; i++) {
    const index = page * 5 + i;
    this._data[index] = list[i];
  }
};

QuestList.prototype.get = function() {
  const list = this._data.map((data) => {
    if (data) {
      return new Quest(data);
    } else {
      return null;
    }
  }).filter((it) => it != null);
  return _.uniqBy(list, (it) => it.no());
};

module.exports = QuestList;
