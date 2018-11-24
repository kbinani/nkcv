const ShipsWindow = require('./src/renderer/ships/ShipsWindow.js');

let _ships_window = null;

function onload() {
  _ships_window = new ShipsWindow();
}
