const isDev = require('electron-is-dev');
window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen} = require('electron');
const Port = require('./src/Port.js'),
      Master = require('./src/Master.js'),
      DataStorage = require('./src/DataStorage.js');
const sprintf = require('sprintf');

var _ships = [];
const storage = new DataStorage();

function onload() {
  storage.on('port', function(port) {
    replace(port.ships);
  });
}

function replace(ships) {
  _ships = ships;

  const tbody = $('#ship_table').children().first();
  tbody.children().each(function() {
    if ($(this).attr('id') == 'ship_table_header') {
      return;
    }
    $(this).remove();
  });

  var index = 1;
  _ships.forEach(function(ship) {
    const element = createShipCell(index, ship);
    tbody.append(element);
    index++;

    const slotitems = ship.slotitems();
    const slotitem_container = $('#ship_' + ship.id() + '_slotitem');
    slotitem_container.empty();
    slotitems.forEach(function(slotitem) {
      console.log(slotitem.name());
      slotitem_container.append(createSlotitemCell(slotitem.id()));
    });
    updateSlotitemStatus(slotitems);
  });

  updateShipStatus(_ships);
}

function createShipCell(index, ship) {
  const template = '\
    <tr class="ThemeTable">\
      <td nowrap>{index}</td>\
      <td nowrap>{ship_id}</td>\
      <td nowrap><span id="ship_{ship_id}_type"></span></td>\
      <td nowrap><span id="ship_{ship_id}_name"></span></td>\
      <td nowrap>Lv. <span id="ship_{ship_id}_level"></span> Next: <span id="ship_{ship_id}_next_exp"></span></td>\
      <td nowrap><div id="ship_{ship_id}_cond_icon"></div><span id="ship_{ship_id}_cond"></span></td>\
      <td nowrap><span id="ship_{ship_id}_karyoku"></span></td>\
      <td nowrap><span id="ship_{ship_id}_raisou"></span></td>\
      <td nowrap><span id="ship_{ship_id}_taiku"></span></td>\
      <td nowrap><span id="ship_{ship_id}_soukou"></span></td>\
      <td nowrap><span id="ship_{ship_id}_lucky"></span></td>\
      <td nowrap><span id="ship_{ship_id}_sakuteki"></span></td>\
      <td nowrap><span id="ship_{ship_id}_taisen"></span></td>\
      <td nowrap><span id="ship_{ship_id}_soku"></span></td>\
      <td nowrap><!-- 出撃海域 --></td>\
      <td nowrap><span id="ship_{ship_id}_repair"></span></td>\
      <td nowrap><div id="ship_{ship_id}_slotitem" style="display: flex;"></div></td>\
    </tr>';
  return template.replace(/\{index\}/g, index)
                 .replace(/\{ship_id\}/g, ship.id());
}

function createSlotitemCell(slotitem_id) {
  const template = '<div title="12.7cm連装砲" id="slotitem_{slotitem_id}_icon" style="flex: 0 0 21px; width: 21px; height: 21px; background-image: url(\'img/main_canon_light.svg\'); background-size: contain; background-repeat: no-repeat; background-position: 50%; padding: 2px;"></div>';
  return template.replace(/\{slotitem_id\}/g, slotitem_id);
}
