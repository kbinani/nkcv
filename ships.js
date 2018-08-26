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

function selectShipType(types) {
  $('#ship_type_all').prop('checked', false);
  ShipType.allCases().forEach(function(type) {
    const checkbox = $('#ship_type_' + type.value());
    const check = types.indexOf(type.value()) >= 0;
    checkbox.prop('checked', check);
  });
  update();
}

function update() {
  const filtered = filter(_ships);
  const sorted = sort(filtered);

  const tbody = $('#ship_table');
  tbody.children().each(function() {
    const id = $(this).attr('id');
    if (id == 'ship_table_header') {
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
    slotitem_container.css('display', slotitems.length == 0 ? 'auto' : 'flex');
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
  const filters = [];

  // 艦種
  const included = ShipType.allCases().filter(function(type) {
    return $('#ship_type_' + type.value()).prop('checked');
  }).map(function(type) {
    return type.value();
  });
  filters.push(function(ship) {
    return included.indexOf(ship.type().value()) >= 0;
  });

  // レベル
  const level = $("input[name='filter_level']:checked").val();
  switch (level) {
    case '2_or_grater':
      filters.push(function(ship) {
        return ship.level() >= 2;
      });
      break;
    case '1':
      filters.push(function(ship) {
        return ship.level() == 1;
      });
      break;
  }

  // 速力
  const soku_list = [];
  const checked = $("input[name='filter_soku']:checked");
  checked.each(function(index) {
    const element = $(checked[index]);
    soku_list.push(parseInt(element.val(), 10));
  });
  filters.push(function(ship) {
    return soku_list.indexOf(ship.soku().value()) >= 0;
  });

  // 損傷
  const damage = $("input[name='filter_damage']:checked").val();
  switch (damage) {
    case 'damaged':
      filters.push(function(ship) {
        const hp = ship.hp();
        return hp.numerator() < hp.denominator();
      });
      break;
    case 'non_damaged':
      filters.push(function(ship) {
        const hp = ship.hp();
        return hp.numerator() == hp.denominator();
      });
      break;
  }

  // ロック
  const locked = $("input[name='filter_lock']:checked").val();
  switch (locked) {
    case 'locked':
      filters.push(function(ship) {
        return ship.locked();
      });
      break;
    case 'non_locked':
      filters.push(function(ship) {
        return !ship.locked();
      });
      break;
  }

  // 改造状態
  const upgraded = $("input[name='filter_upgrade']:checked").val();
  switch (upgraded) {
    case 'upgraded':
      filters.push(function(ship) {
        return ship.after_level() == 0;
      });
      break;
    case 'non_upgraded':
      filters.push(function(ship) {
        return ship.after_level() > 0;
      });
      break;
  }

  // cond
  const cond = $("input[name='filter_cond']:checked").val();
  switch (cond) {
    case '50_or_grater':
      filters.push(function(ship) {
        return ship.cond() >= 50;
      });
      break;
    case 'lower_than_50':
      filters.push(function(ship) {
        return ship.cond() < 50;
      });
      break;
  }

  // 遠征
  const mission = $("input[name='filter_mission']");
  if (mission.prop('checked')) {
    filters.push(function(ship) {
      return !ship.is_mission();
    });
  }

  // 近代化改修
  const remodel = $("input[name='filter_remodel']:checked").val();
  switch (remodel) {
    case 'remodelled':
      filters.push(function(ship) {
        return ship.remodel_completed();
      });
      break;
    case 'non_remodelled':
      filters.push(function(ship) {
        return !ship.remodel_completed();
      });
      break;
  }

  var result = ships;

  filters.forEach(function(by) {
    result = result.filter(by);
  });

  return result;
}

function createShipCell(index, ship) {
  const template = '\
    <div class="ThemeTableRow" style="display: table-row;">\
      <div class="ThemeTableCell">{index}</div>\
      <div class="ThemeTableCell">{ship_id}</div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_type"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_name"></span></div>\
      <div class="ThemeTableCell">Lv. <span id="ship_{ship_id}_level"></span> Next: <span id="ship_{ship_id}_next_exp"></span></div>\
      <div class="ThemeTableCell"><div id="ship_{ship_id}_cond_icon"></div><span id="ship_{ship_id}_cond"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_karyoku"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_raisou"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_taiku"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_soukou"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_lucky"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_sakuteki"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_taisen"></span></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_soku"></span></div>\
      <div class="ThemeTableCell"><!-- 出撃海域 --></div>\
      <div class="ThemeTableCell"><span id="ship_{ship_id}_repair"></span></div>\
      <div class="ThemeTableCell" id="ship_{ship_id}_slotitem" style="height: 25px; vertical-align: middle;"></div>\
    </div>';
  return template.replace(/\{index\}/g, index)
                 .replace(/\{ship_id\}/g, ship.id());
}

function createSlotitemCell(slotitem_id) {
  const template = '<div title="12.7cm連装砲" id="slotitem_{slotitem_id}_icon" style="flex: 0 0 21px; width: 21px; height: 21px; background-image: url(\'img/main_canon_light.svg\'); background-size: contain; background-repeat: no-repeat; background-position: 50%; margin: 2px 2px 0px 0px;"></div>';
  return template.replace(/\{slotitem_id\}/g, slotitem_id);
}
