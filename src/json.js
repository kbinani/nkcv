'use strict;'

const HJSON = require('HJSON'),
      fs = require('fs');

function save(object, filepath) {
  fs.writeFileSync(filepath, JSON.stringify(object, null, 2));
}

module.exports = {
  fromFile: (filepath) => {
    let str = fs.readFileSync(filepath, {encoding: 'utf8'}).toString();
    return HJSON.parse(str);
  },
  toFile: (a, b) => {
    if (typeof(a) == 'string' && typeof(b) == 'object') {
      save(b, a);
    } else if (typeof(a) == 'object' && typeof(b) == 'string') {
      save(a, b);
    } else {
      throw `引数がおかしい. 引数の片方がファイルパス、もう片方がオブジェクトの場合のみ受け付けます: a=${a}; b=${b}`;
    }
  },
};
