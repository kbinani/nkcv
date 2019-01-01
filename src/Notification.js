'use strict;'

const os = require('os');

class Notification {
  static show(message) {
    if (os.platform() == 'win32') {
      const notifier = require('node-notifier');
      notifier.notify({
        'title': 'nkcv',
        'message': message,
        'sound': true,
      });
    } else {
      const {ipcMain, ipcRenderer} = require('electron');
      if (ipcMain) {
        const NativeNotification = require('electron').Notification;
        const n = new NativeNotification({'title': 'nkcv', 'body': message});
        n.show();
      } else {
        ipcRenderer.send('app.notification', message);
      }
    }
  }
}

module.exports = Notification;
