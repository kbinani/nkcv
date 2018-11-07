'use strict;'

const os = require('os');

function Notification() {
}

Notification.show = function(message) {
  if (os.platform() == 'win32') {
    const notifier = require('node-notifier');
    notifier.notify({
      'title': 'nkcv',
      'message': message,
      'sound': true,
    });
  } else {
    const {Notification} = require('electron');
    const n = new Notification({'title': 'nkcv', 'body': message});
    n.show();
  }
};

module.exports = Notification;
