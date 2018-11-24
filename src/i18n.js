'use strict;'

const i18n = require('i18n');

i18n.configure({
  locales: ['ja', 'en'],
  directory: __dirname + '/../locales',
});

module.exports = i18n;
