'use strict;'

module.exports = {
  wrap: (text, numChars) => {
    let result = '';
    let current = '';
    let tokens = text.split(/ /);
    for (let i = 0; i < tokens.length; i++) {
      let next = current;
      if (next.length > 0) {
        next += ' ';
      }
      next += tokens[i];
      if (next.length <= numChars) {
        current = next;
      } else {
        if (result.length > 0) {
          result += '\n';
        }
        result += current;
        current = tokens[i];
      }
    }
    if (current.length > 0) {
      if (result.length > 0) {
        result += '\n';
      }
      result += current;
    }
    return result;
  },
};
