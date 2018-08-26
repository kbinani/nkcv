window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen} = require('electron');
const Port = require('./src/Port.js'),
      Master = require('./src/Master.js'),
      DataStorage = require('./src/DataStorage.js'),
      ShipType = require('./src/ShipType.js');
const sprintf = require('sprintf');

var _ships = [];
const storage = new DataStorage();

function onload() {
  storage.on('port', function(port) {
    _ships = port.ships;
    update();
  });

  const choices = $('#ship_type_choices');
  const template = `
    <label for="ship_type_{id}" style="height: 25px; line-height: 25px; margin-right: 10px; white-space: nowrap;">
      <input id="ship_type_{id}" type="checkbox" onclick="shipTypeCheckboxClicked()" checked="checked"/><span id="ship_type_{id}_label">{name}</span>
    </label>`
  ShipType.allCases().forEach(function(type) {
    const element = template.replace(/\{id\}/g, type.value())
                            .replace(/\{name\}/g, type.toString());
    choices.append(element);
  });
}

function toggleAll() {
  const checked = $('#ship_type_all').prop('checked');
  ShipType.allCases().forEach(function(type) {
    const checkbox = $('#ship_type_' + type.value());
    checkbox.prop('checked', checked);
  });
  update();
}

function shipTypeCheckboxClicked() {
  var allchecked = true;
  ShipType.allCases().forEach(function(type) {
    const checkbox = $('#ship_type_' + type.value());
    allchecked &= checkbox.prop('checked');
  });
  $('#ship_type_all').prop('checked', allchecked);
  update();
}

function update() {
  const filtered = filter(_ships);
  const sorted = sort(filtered);

  const tbody = $('#ship_table').children().first();
  tbody.children().each(function() {
    if ($(this).attr('id') == 'ship_table_header') {
      return;
    }
    $(this).remove();
  });

  var index = 1;
  sorted.forEach(function(ship) {
    const element = createShipCell(index, ship);
    tbody.append(element);
    index++;

    const slotitems = ship.slotitems();
    const slotitem_container = $('#ship_' + ship.id() + '_slotitem');
    slotitem_container.empty();
    slotitems.forEach(function(slotitem) {
      slotitem_container.append(createSlotitemCell(slotitem.id()));
    });
    updateSlotitemStatus(slotitems);
  });

  updateShipStatus(_ships);
}

function sort(ships) {
  //TODO
  return ships;
}

function filter(ships) {
  const included = ShipType.allCases().filter(function(type) {
    return $('#ship_type_' + type.value()).prop('checked');
  }).map(function(type) {
    return type.value();
  });
  return ships.filter(function(ship) {
    return included.indexOf(ship.type().value()) >= 0;
  });
}

function createShipCell(index, ship) {
  const template = '\
    <tr class="ThemeTable" style="height: 30px;">\
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
