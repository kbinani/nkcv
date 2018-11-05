'use strict;'

function Notification() {
}

Notification.show = function(message) {
  const notifier = require('node-notifier');
  notifier.notify({
    'title': 'nkcv',
    'message': message
  });
};

module.exports = Notification;
