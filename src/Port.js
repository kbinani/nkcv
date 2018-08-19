'use strict;'

const HTTPProxy = require(__dirname + '/HTTPProxy.js'),
      Master = require(__dirname + '/Master.js');

function Port(data, master) {
  this._data = data;
  this._master = master;
}

const _ = Port;
var maxObserverId = -1;
const observers = {};

HTTPProxy.on('api_port/port', function(data) {
  const port = new Port(JSON.parse(data), Master.shared);
  for (var key in observers) {
    observers[key](port);
  }
});

_.addObserver = function(callback) {
  maxObserverId++;
  observers[maxObserverId] = callback;
  return maxObserverId;
};

module.exports = _;
