'use strict;'

function clone(o) {
  if (o == null) {
    return null;
  }
  if (Array.isArray(o)) {
    let newObj = [];
    for (let i = 0; i < o.length; i++) {
      newObj.push(clone(o[i]));
    }
    return newObj;
  } else if (typeof(o) != 'object') {
    return o;
  } else {
    let newObj = {};
    Object.keys(o).forEach((key) => {
      newObj[key] = clone(o[key]);
    });
    return newObj;
  }
}

module.exports = clone;
