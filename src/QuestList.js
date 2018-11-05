'use strict;'

const _ = require('lodash'),
      Quest = require(__dirname + '/Quest.js');

function QuestList() {
  this._list = [];
}

QuestList.prototype.update = function(data) {
  const count = _.get(data, ['api_data', 'api_count'], -1);
  if (count <= 0) {
    this._list = [];
    return;
  }

  const list = _.get(data, ['api_data', 'api_list'], []);
  for (var i = 0; i < list.length; i++) {
    const quest = new Quest(list[i]);
    const idx = _.findIndex(this._list, (it) => it.no() == quest.no());
    if (idx >= 0) {
      this._list[idx] = quest;
    } else {
      this._list.push(quest);
    }
  }

  this._list.sort((a, b) => {
    return a.no() - b.no();
  });
};

QuestList.prototype.get = function() {
  return this._list.slice();
};

QuestList.prototype.complete = function(id) {
  const idx = _.findIndex(this._list, (it) => it.no() == id);
  if (idx < 0) {
    return;
  }
  this._list.splice(idx, 1);
};

module.exports = QuestList;
