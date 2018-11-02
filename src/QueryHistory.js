'use strict;'

function QueryHistory(maxLength) {
  this.maxLength = maxLength;
  this.history = [];
  this.onChange = null;
}

QueryHistory.prototype.append = function(query) {
  const index = this.history.indexOf(query);
  var changed = false;
  if (index >= 0) {
    if (index + 1 != this.history.length) {
      this.history.splice(index, 1);
      this.history.push(query);
      changed = true;
    }
  } else {
    this.history.push(query);
    changed = true;
  }
  if (changed && typeof(this.onChange) == 'function') {
    this.onChange();
  }
}

module.exports = QueryHistory;
