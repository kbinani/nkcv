'use strict;'

module.exports = function(o, key, options) {
  if (typeof(o) !== 'object') {
    return;
  }

  let case_sensitive = true;
  if (typeof(options['case_sensitive']) == 'boolean') {
    case_sensitive = options['case_sensitive'];
  }

  let key_for_search = key;
  if (case_sensitive) {
    key_for_search = key.toLowerCase();
  }

  for (let k in o) {
    if (case_sensitive) {
      if (key_for_search == k.toLowerCase()) {
        delete o[k];
      }
    } else {
      if (k == key) {
        delete o[k];
      }
    }
  }
};
