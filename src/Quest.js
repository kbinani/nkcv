'use strict;'

const _ = require('lodash');
const json = require(__dirname + '/json.js'),
      i18n = require(__dirname + '/i18n.js');

const quest_en_translation = json.fromFile(__dirname + '/../ext/kc3-translations/data/en/quests.json');

class Quest {
  constructor(data) {
    this._data = data;
  }

  no() {
    return _.get(this._data, ['api_no'], -1);
  }

  title() {
    const title = _.get(this._data, ['api_title'], '');
    if (i18n.getLocale() == 'ja') {
      return title;
    }
    const api_no = this.no();
    return _.get(quest_en_translation, [api_no, 'name'], title);
  }

  detail() {
    const detail = _.get(this._data, ['api_detail'], '');
    if (i18n.getLocale() == 'ja') {
      return detail;
    }
    const api_no = this.no();
    return _.get(quest_en_translation, [api_no, 'desc'], detail);
  }

  state() {
    return _.get(this._data, ['api_state'], 1);
  }

  category() {
    return _.get(this._data, ['api_category'], -1);
  }
}

module.exports = Quest;
