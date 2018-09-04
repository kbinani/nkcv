'use strict;'

const os = require('os'),
      _ = require('lodash');

const Dialog = {};

Dialog.confirm = function(options) {
  const title = _.get(options, ['title'], '');
  const message = _.get(options, ['message'], '');
  const yes = _.get(options, ['yes'], 'はい');
  const no = _.get(options, ['no'], 'いいえ');

  var {dialog} = require('electron');
  if (!dialog) {
    var {dialog} = require('electron').remote;
  }

  const darwin = os.platform() == 'darwin';
  const cancelId = 1;
  const opt = {
    type: 'question',
    buttons: [yes, no],
    title: title,
    message: message,
    cancelId: cancelId,
  };
  if (!darwin) {
    opt['defaultId'] = cancelId;
  }
  const response = dialog.showMessageBox(opt);
  return response != cancelId;
};

module.exports = Dialog;
