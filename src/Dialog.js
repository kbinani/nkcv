'use strict;'

const os = require('os');

const Dialog = {};

Dialog.showYesNoMessageBox = function(title, message) {
  var {dialog} = require('electron');
  if (!dialog) {
    var {dialog} = require('electron').remote;
  }

  const darwin = os.platform() == 'darwin';
  const buttons = darwin ? ['いいえ', 'はい'] : ['はい', 'いいえ'];
  const cancelId = darwin ? 0 : 1;
  const options = {
    type: 'question',
    buttons: buttons,
    title: title,
    message: message,
    cancelId: cancelId,
  };
  if (!darwin) {
    options['defaultId'] = cancelId;
  }
  const response = dialog.showMessageBox(options);
  return response != cancelId;
};

module.exports = Dialog;
