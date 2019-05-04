'use strict;'

const container = {};

container.clone = require(__dirname + '/util/clone.js');
container.delete = require(__dirname + '/util/delete.js');
container.case = {};
container.case.insensitive = {};
container.case.insensitive.set = function(object, key, value) {
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i++) {
    const it = keys[i];
    if (it.toLowerCase() == key.toLowerCase()) {
      object[it] = value;
      return;
    }
  }
  object[key] = value;
};
container.case.insensitive.get = function(object, key) {
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i++) {
    const it = keys[i];
    if (it.toLowerCase() == key.toLowerCase()) {
      return object[it];
    }
  }
  // return undefined
};

module.exports = container;
