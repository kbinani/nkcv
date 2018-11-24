'use strict;'

const is_dev = require('electron-is-dev');
const i18n = require(__dirname + '/../../i18n.js');

function LeftPanel() {
  this.$element = $('#webview_left_panel');
  this.$knotch = $('#webview_left_panel_knotch');
  this.$background = $('#webview_left_panel_background');
  this.$content = $('#webview_left_panel_content');

  this.$knotch.css('width', LeftPanel.KNOTCH_WIDTH + 'px');
  this.$knotch.css('height', LeftPanel.KNOTCH_HEIGHT + 'px');

  this.state = '';
  this.setState('normal');
  this.$element.css('display', 'flex'); // 最初にロードしたときに見えてしまわないように dom の初期値が none になっているので flex に設定しています

  this._timerId = null;
}

LeftPanel.KNOTCH_HEIGHT = 100;
LeftPanel.KNOTCH_WIDTH = 20;

LeftPanel.prototype.applyScale = function(scale) {
  this.$element.css('height', (height * scale) + 'px');
  this.$knotch.css('top', (height * scale * 0.5 - LeftPanel.KNOTCH_HEIGHT * 0.5) + 'px');
  this.$background.css('height', (height * scale) + 'px');
};

LeftPanel.prototype.setState = function(state) {
  switch (state) {
    case 'show':
      this.$element.removeClass('hide');
      this.$element.addClass('show');
      this.$background.css('display', 'block');
      break;
    case 'hide':
      this.$element.removeClass('show');
      this.$element.addClass('hide');
      this.$background.css('display', 'none');
      break;
    case 'normal':
      this.$element.removeClass('hide');
      this.$element.removeClass('show');
      this.$background.css('display', 'none');
      break;
    default:
      return;
  }
  this.state = state;
};

LeftPanel.prototype.toggle = function() {
  switch (this.state) {
    case 'normal':
      return;
    case 'show':
      this.setState('hide');
      break;
    case 'hide':
      this.setState('show');
      break;
  }
};

LeftPanel.prototype.set_battle_result = function(result) {
  if (this._timerId != null) {
    clearInterval(this._timerId);
    this._timerId = null;
  }

  if (result == null) {
    this.setState('normal');
    return;
  }

  this._timerId = setTimeout(() => {
    const contents = result.enemies().map((enemy) => {
      const name = enemy.name();
      const translated = i18n.__(name);
      const hp = enemy.hp();
      return `<span data-i18n="${name}">${translated}</span> (${hp.toString()})`;
    }).join('<br/>');

    this.$content.html(contents);
    if (result.is_midnight_planned() || is_dev) {
      if (this.state == 'normal') {
        this.setState('hide');
      }
    } else {
      this.setState('normal');
    }
  }, result.performance_seconds() * 1000);
};

module.exports = LeftPanel;
