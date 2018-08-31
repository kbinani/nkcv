'use strict;'

const _ = require('lodash');

function Quest(data) {
  this._data = data;
}

Quest.prototype.no = function() {
  return _.get(this._data, ['api_no'], -1);
};

Quest.prototype.title = function() {
  return _.get(this._data, ['api_title'], '');
};

Quest.prototype.detail = function() {
  return _.get(this._data, ['api_detail'], '');
};

Quest.prototype.state = function() {
  return _.get(this._data, ['api_state'], 1);
}

module.exports = Quest;
