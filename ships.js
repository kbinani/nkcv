window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen} = require('electron');
const Port = require('./src/Port.js'),
      Master = require('./src/Master.js'),
      DataStorage = require('./src/DataStorage.js'),
      ShipType = require('./src/ShipType.js'),
      SallyArea = require('./src/SallyArea.js'),
      QueryHistory = require('./src/QueryHistory.js'),
      QueryPresetList = require('./src/QueryPresetList.js'),
      ShipsWindow = require('./src/renderer/ships/ShipsWindow.js');
const sprintf = require('sprintf'),
      _ = require('lodash'),
      alasql = require('alasql'),
      i18n = require('i18n');

var _ships = [];
const storage = new DataStorage();
const sort_order_key = [
  'id',
  'type',
  'name',
  'level',
  'cond',
  'karyoku',
  'raisou',
  'taiku',
  'soukou',
  'lucky',
  'sakuteki',
  'taisen',
  'soku',
  'sally_area',
  'repair_seconds',
];
const sort_order = [
  {'key': 'level', 'is_descending': false},
];
var sort_order_inverted = false;
const _query_history = new QueryHistory(50);
const _query_preset_list = new QueryPresetList({});
var _filter_config_received = false;
var _sort_config_received = false;
var _sql_preset_list_received = false;
var _ships_window = new ShipsWindow();

function onload() {
  require('electron-disable-file-drop');

  SallyArea.load_remote_mapping(function() {
    const $container = $('#sally_area_choices');
    const sally_area_template = `
      <label for="sally_area_{id}" style="display: block; height: 25px; line-height: 25px; margin-right: 10px; white-space: nowrap; background-color: {background_color}; color: {text_color}; min-width: 80px; flex: 0 0 auto; vertical-align: middle;">
        <input id="sally_area_{id}" type="checkbox" onclick="sallyAreaCheckboxClicked()" checked="checked"/><span id="sally_area_{id}" style="margin-right: 10px;">{name}</span>
      </label>`
    const allSallyAreas = SallyArea.allCases();
    $container.empty();
    if (allSallyAreas.length > 1) {
      allSallyAreas.forEach((it) => {
        const name = it.name();
        const element = sally_area_template.replace(/{id}/g, it.id())
                                .replace(/{name}/g, name.length == 0 ? 'なし' : name)
                                .replace(/{background_color}/g, it.background_color())
                                .replace(/{text_color}/g, it.text_color());
        $container.append(element);
      });
      $('#sally_area_choices_container').css('display', 'flex');
    } else {
      $('#sally_area_choices_container').css('display', 'none');
    }
  });

  const choices = $('#ship_type_choices');
  const template = `
    <label for="ship_type_{id}" style="height: 25px; line-height: 25px; margin-right: 10px; white-space: nowrap;">
      <input id="ship_type_{id}" type="checkbox" onclick="shipTypeCheckboxClicked()" checked="checked"/><span id="ship_type_{id}_label" data-i18n="{name_key}">{name}</span>
    </label>`
  ShipType.allCases().forEach(function(type) {
    const element = template.replace(/{id}/g, type.value())
                            .replace(/{name}/g, i18n.__(`shiptype.${type.toString()}`))
                            .replace(/{name_key}/g, `shiptype.${type.toString()}`);
    choices.append(element);
  });

  storage.on('port', function(port) {
    update(port.ships);
  });

  setQueryEnabled(false);

  $('#query').bind('input propertychange', function() {
    queryChanged()
  });

  $('#query').keypress(function(e) {
    if (e.which == 13) {
      queryDidEntered();
      return false;
    }
  });

  _query_history.onChange = function() {
    queryHistoryChanged();
  };

  _query_preset_list.onChange = function() {
    loadQueryPresetList();
    if (_sql_preset_list_received) {
      ipcRenderer.send('app.patchConfig', {'sqlPresetList': _query_preset_list.toJSON()});
    }
  };

  ipcRenderer.on('app.shipWindowSort', function(event, data) {
    sort_order.splice(0, sort_order.length);
    const sort = _.get(data, ['orders'], []);
    sort.forEach((it) => {
      sort_order.push(it);
    });
    sort_order_inverted = _.get(data, ['inverted'], false);
    applySort();
    _sort_config_received = true;
  });

  ipcRenderer.on('app.shipWindowFilter', function(event, data) {
    $("input[name='filter_cond']").val([_.get(data, ['cond'], 'any')]);
    $("input[name='filter_damage']").val([_.get(data, ['damage'], 'any')]);
    $("input[name='filter_level']").val([_.get(data, ['level'], 'any')]);
    $("input[name='filter_lock']").val([_.get(data, ['lock'], 'any')]);
    const exclude_mission = _.get(data, ['mission'], 'exclude') == 'exclude';
    $("input[name='filter_mission']").prop('checked', exclude_mission);
    $("input[name='filter_remodel']").val([_.get(data, ['remodel'], 'any')]);
    $("input[name='filter_soku']").val(_.get(data, ['soku'], []));
    const type = _.get(data, ['type'], []);
    ShipType.allCases().forEach((it) => {
      const check = type.indexOf(it.value()) >= 0;
      $('#ship_type_' + it.value()).prop('checked', check);
    });
    $("input[name='filter_upgrade']").val([_.get(data, ['upgrade'], 'any')]);
    _filter_config_received = true;
  });

  ipcRenderer.on('app.sqlPresetList', function(event, data) {
    // ここは 1 回しか来ないはず
    _query_preset_list.patch(data);
    loadQueryPresetList();
    _sql_preset_list_received = true;
  });

  ipcRenderer.send('app.shipWindowDidLoad', {});
}

function loadQueryPresetList() {
  const preset_list = _query_preset_list.list;
  const $query_preset_choice = $('#query_preset_choice');
  const current = $query_preset_choice.val();
  $query_preset_choice.empty();
  $query_preset_choice.append('<option value="empty">-</option>');

  const keys = Object.keys(preset_list);
  keys.sort();
  keys.forEach((key) => {
    const preset = preset_list[key];
    const template = `<option value="{id}">{title}</option>`;
    const element = template.replace(/{id}/g, preset.id)
                            .replace(/{title}/g, preset.title);
    $query_preset_choice.append(element);
  });

  $query_preset_choice.val(current);
};

function shipTypeCheckboxClicked() {
  ShipType.allCases().forEach(function(type) {
    const checkbox = $('#ship_type_' + type.value());
  });
  applyFilter();
}

function selectShipType(types) {
  ShipType.allCases().forEach(function(type) {
    const checkbox = $('#ship_type_' + type.value());
    const check = types.indexOf(type.value()) >= 0;
    checkbox.prop('checked', check);
  });
  applyFilter();
}

function update(ships) {
  const removed_ships = _.differenceBy(_ships, ships, (ship) => ship.id());
  const added_ships = _.differenceBy(ships, _ships, (ship) => ship.id());

  removed_ships.forEach((ship) => {
    $('#ship_' + ship.id() + '_row').remove();
  });

  const $tbody = $('#ship_table');
  var appending = '';
  added_ships.forEach((ship) => {
    const element = createShipCell(ship);
    appending += element;
  });
  $tbody.append(appending);

  const before_lut = {};
  _ships.forEach((ship) => {
    before_lut[ship.id()] = shipToString(ship);
  });

  const after_lut = {};
  ships.forEach((ship) => {
    after_lut[ship.id()] = shipToString(ship);
  });

  const existing_ships = _.intersectionBy(ships, _ships, (ship) => ship.id());

  const updated_ships = [];
  existing_ships.forEach((ship) => {
    const id = ship.id();
    const before = before_lut[id];
    const after = after_lut[id];
    if (before != after) {
      updated_ships.push(ship);
    }
  });

  _.concat(updated_ships, added_ships).forEach((ship) => {
    const slotitems = ship.slotitems();
    const slotitem_ids = slotitems.map((it) => it.id());
    const ex = ship.ex_slotitem();
    if (ex) {
      slotitem_ids.push(-1);
      slotitem_ids.push(ex.id());
      slotitems.push(ex);
    }

    const slotitem_container = $('.ship_' + ship.id() + '_slotitem');
    slotitem_container.empty();
    slotitem_container.css('display', slotitems.length == 0 ? 'auto' : 'flex');
    slotitem_ids.forEach(function(id) {
      slotitem_container.append(createSlotitemCell(id));
    });
    updateSlotitemStatus(slotitems);
  });

  updateShipStatus(updated_ships);

  _ships = ships.map((it) => it.clone());
  applySort();
  applyFilter();
}

const _QUERY_PREFIX_DISPLAY = 'SELECT * FROM ships WHERE ';
const _QUERY_PREFIX_ALASQL = 'SELECT id FROM ? WHERE ';

function createQueryDisplay() {
  return _QUERY_PREFIX_DISPLAY + $('#query').val();
}

function createQueryAlasql() {
  return _QUERY_PREFIX_ALASQL + $('#query').val();
}

function applyFilter() {
  const config_filters = {};
  var where = [];

  // 艦種
  const included = ShipType.allCases().filter(function(type) {
    return $('#ship_type_' + type.value()).prop('checked');
  }).map(function(type) {
    return type.value();
  });
  config_filters['type'] = included;
  if (included.length < ShipType.allCases().length) {
    where.push('type IN(' + included.join(', ') + ')');
  }

  // レベル
  const level = $("input[name='filter_level']:checked").val();
  switch (level) {
    case '2_or_grater':
      where.push('level > 2');
      break;
    case '1':
      where.push('level = 1');
      break;
  }
  config_filters['level'] = level;

  // 速力
  const soku_list = [];
  const checked = $("input[name='filter_soku']:checked");
  checked.each(function(index) {
    const element = $(checked[index]);
    soku_list.push(parseInt(element.val(), 10));
  });
  config_filters['soku'] = soku_list;
  if (soku_list.length > 0) {
    where.push('soku IN(' + soku_list.join(', ') + ')');
  }

  // 損傷
  const damage = $("input[name='filter_damage']:checked").val();
  switch (damage) {
    case 'damaged':
      where.push('hp < maxhp');
      break;
    case 'non_damaged':
      where.push('hp = maxhp');
      break;
  }
  config_filters['damage'] = damage;

  // ロック
  const locked = $("input[name='filter_lock']:checked").val();
  switch (locked) {
    case 'locked':
      where.push('locked = TRUE');
      break;
    case 'non_locked':
      where.push('locked = FALSE');
      break;
  }
  config_filters['lock'] = locked;

  // 改造状態
  const upgraded = $("input[name='filter_upgrade']:checked").val();
  switch (upgraded) {
    case 'upgraded':
      where.push('after_level = 0');
      break;
    case 'non_upgraded':
      where.push('after_level > 0');
      break;
  }
  config_filters['upgrade'] = upgraded;

  // cond
  const cond = $("input[name='filter_cond']:checked").val();
  switch (cond) {
    case '50_or_grater':
      where.push('cond >= 50');
      break;
    case 'lower_than_50':
      where.push('cond < 50');
      break;
  }
  config_filters['cond'] = cond;

  // 遠征
  const mission = $("input[name='filter_mission']");
  if (mission.prop('checked')) {
    where.push('is_mission = FALSE');
  }
  config_filters['mission'] = mission.prop('checked') ? 'exclude' : 'include';

  // 近代化改修
  const remodel = $("input[name='filter_remodel']:checked").val();
  switch (remodel) {
    case 'remodelled':
      where.push('remodel_completed = TRUE');
      break;
    case 'non_remodelled':
      where.push('remodel_completed = FALSE');
      break;
  }
  config_filters['remodel'] = remodel;

  // 出撃海域
  const areas = SallyArea.allCases().filter((it) => {
    return $('#sally_area_' + it.id()).prop('checked');
  }).map((it) => it.id());
  config_filters['sally_area'] = areas;
  if (areas.length > 0) {
    where.push('sally_area IN(' + areas.join(', ') + ')');
  }

  var query = '';

  var contains_id_key = false;
  var order_by = [];
  for (var i = 0; i < sort_order.length; i++) {
    const it = sort_order[i];
    const key = it.key;
    order_by.push(key + (it.is_descending ? ' DESC' : ' ASC'));
    if (key == 'id') {
      contains_id_key = true;
    } else if (key == 'level') {
      order_by.push('next_exp ' + (it.is_descending ? 'ASC' : 'DESC'));
    }
  }
  if (!contains_id_key) {
    order_by.push('id ' + (sort_order_inverted ? 'DESC' : 'ASC'));
  }

  const query_enabled = $('#use_query').prop('checked');
  if (query_enabled) {
    query = createQueryAlasql();
  } else {
    var query_after_where = where.join(' AND ');
    if (order_by.length > 0) {
      query_after_where += ' ORDER BY ' + order_by.join(', ');
    }
    query = 'SELECT id FROM ? WHERE ' + query_after_where;
    $('#query').val(query_after_where);
  }

  const ships = _ships.map((ship) => {
    return shipToJSON(ship);
  });
  var compiled = null;
  try {
    compiled = alasql.compile(query);
  } catch (e) {
    return;
  }
  const visible_ids = compiled([ships]).map((it) => it.id);
  const invisible_ids = _.difference(ships.map((it) => it.id), visible_ids);

  invisible_ids.forEach((id) => {
    const $row = $('#ship_' + id + '_row');
    $row.css('display', 'none');
  });

  const container = $('#ship_table');

  var row_index = 0;
  visible_ids.forEach((id) => {
    const $row = $('#ship_' + id + '_row');
    $row.css('display', 'table-row');
    row_index++;
    if (row_index % 2 == 0) {
      $row.addClass('ThemeTableRowEven');
      $row.removeClass('ThemeTableRowOdd');
    } else {
      $row.addClass('ThemeTableRowOdd');
      $row.removeClass('ThemeTableRowEven');
    }
    $('.ship_' + id + '_index').html(row_index);
    container.append($row);
  });

  if (_filter_config_received) {
    ipcRenderer.send('app.patchConfig',{'shipWindowFilter': config_filters});
  }
}

function applySort() {
  sort_order_key.forEach(key => {
    unsetSortOrder($('#sort_order_' + key));
  });
  var index = 1;
  sort_order.forEach(function(it) {
    const key = it.key;
    const is_descending = it.is_descending === true;
    setSortOrder($('#sort_order_' + key), index, is_descending);
    index++;
  });

  if (_sort_config_received) {
    ipcRenderer.send('app.patchConfig', {
      'shipWindowSort': {
        'orders': sort_order,
        'inverted': sort_order_inverted
      }
    });
  }
}

function createShipCell(ship) {
  const template = `
    <div id="ship_{ship_id}_row" class="ThemeTableRow" style="display: table-row;">
      <div class="ThemeTableCell"><span class="ship_{ship_id}_index"></span></div>
      <div class="ThemeTableCell">{ship_id}</div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_type" data-i18n="{type_key}">{type}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_name" data-i18n="{name}">{localized_name}</span></div>
      <div class="ThemeTableCell">Lv. <span class="ship_{ship_id}_level">{level}</span> Next: <span class="ship_{ship_id}_next_exp">{next_exp}</span></div>
      <div class="ThemeTableCell"><div class="ship_{ship_id}_cond_icon"></div><span class="ship_{ship_id}_cond">{cond}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_karyoku">{karyoku}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_raisou">{raisou}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_taiku">{taiku}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_soukou">{soukou}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_lucky">{lucky}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_sakuteki">{sakuteki}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_taisen">{taisen}</span></div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_soku">{soku}</span></div>
      <div class="ThemeTableCell" sylte="vertical-align: middle;">
        <div style="display: flex; height: 25px; line-height: 25px;">
          <div class="ship_{ship_id}_sally_area FontNormal" style="flex: 1 1 auto; height: 19px; line-height: 19px; margin-top: 3px; margin-bottom: 3px; color: {sally_area_text_color}; background-color: {sally_area_background_color}; text-align: center; vertical-align: middle; padding: 0px 5px 0px 5px;">{sally_area}</div>
        </div>
      </div>
      <div class="ThemeTableCell"><span class="ship_{ship_id}_repair">{repair}</span></div>
      <div class="ThemeTableCell ship_{ship_id}_slotitem" style="height: 25px; vertical-align: middle;"></div>
    </div>`;
  const sally_area = ship.sally_area();
  return template.replace(/{ship_id}/g, ship.id())
                 .replace(/{level}/, ship.level())
                 .replace(/{type}/g, i18n.__(`shiptype.${ship.type().toString()}`))
                 .replace(/{type_key}/g, `shiptype.${ship.type().toString()}`)
                 .replace(/{name}/g, ship.name())
                 .replace(/{next_exp}/, ship.next_exp())
                 .replace(/{cond}/, ship.cond())
                 .replace(/{karyoku}/, ship.karyoku().numerator())
                 .replace(/{raisou}/, ship.raisou().numerator())
                 .replace(/{taiku}/, ship.taiku().numerator())
                 .replace(/{soukou}/, ship.soukou().numerator())
                 .replace(/{lucky}/, ship.lucky().numerator())
                 .replace(/{sakuteki}/, ship.sakuteki().numerator())
                 .replace(/{taisen}/, ship.taisen().numerator())
                 .replace(/{soku}/, ship.soku().toString())
                 .replace(/{repair}/, ship.repair_seconds() > 0 ? timeLabel(ship.repair_seconds()) : '')
                 .replace(/{sally_area}/, ship.sally_area().name())
                 .replace(/{sally_area_background_color}/, sally_area.id() == 0 ? 'transparent' : sally_area.background_color())
                 .replace(/{sally_area_text_color}/, sally_area.text_color())
                 .replace(/{localized_name}/g, i18n.__(ship.name()));
}

function createSlotitemCell(slotitem_id) {
  if (slotitem_id == -1) {
    return '<div class="ThemeContainerBorderL" style="flex: 0 0 auto; width: 1px; height: 21px; margin: 2px 2px 0px 0px;"></div>';
  } else {
    const template = `
      <div title="12.7cm連装砲" class="slotitem_{slotitem_id}_icon" style="display: flex; flex-direction: column; flex: 0 0 auto; width: 21px; height: 21px; background-image: url(\'img/main_canon_light.svg\'); background-size: contain; background-repeat: no-repeat; background-position: 50%; margin-left: 3px; margin-right: 3px;">
        <div style="display: flex; flex: 1 1 auto; height: 10px; line-height: 10px; font-size: 6px; text-align: center;">
          <div style="flex: 1 1 auto;"></div>
          <div class="slotitem_{slotitem_id}_proficiency" style="flex: 0 0 auto; padding: 2px;"></div>
        </div>
        <div class="slotitem_{slotitem_id}_level" style="flex: 1 1 auto; height: 11px; line-height: 11px; font-size: 6px; text-align: center;">
        </div>
      </div>`;
    return template.replace(/{slotitem_id}/g, slotitem_id);
  }
}

function unsetSortOrder($element) {
  $element.css('display', 'none');
}

function setSortOrder($element, order_index, is_descending) {
  if (order_index < 0) {
    unsetSortOrder($element);
  } else {
    $element.css('display', 'block');
    $element.html(order_index + (is_descending ? "▼" : "▲"));
  }
}

function resetSortOrder() {
  sort_order.splice(0, sort_order.length);
  sort_order_inverted = false;
  applySort();
  applyFilter();
}

function invertSortOrder() {
  sort_order.forEach((it) => it.is_descending = !it.is_descending);
  sort_order_inverted = !sort_order_inverted;
  applySort();
  applyFilter();
}

function sortOrderClicked(key) {
  const query_enabled = $('#use_query').prop('checked');
  if (query_enabled) {
    return;
  }

  const index = _.findIndex(sort_order, function(it) { return it.key == key; });
  if (index >= 0) {
    const existing = sort_order[index];
    existing.is_descending = !existing.is_descending;
  } else {
    if (sort_order.length == 0 && key == 'id') {
      sort_order.push({'key': key, 'is_descending': true});
    } else {
      sort_order.push({'key': key, 'is_descending': false});
    }
  }
  applySort();
  applyFilter();
}

function sallyAreaCheckboxClicked() {
  applyFilter();
}

function togglePanel(panel_title_id, panel_id) {
  const current_visible = $('#' + panel_id).css('display') == 'flex';
  $('#' + panel_id).css('display', current_visible ? 'none' : 'flex');
  $('#' + panel_title_id).css('background-image', current_visible ? "url('img/baseline-unfold_less-24px.svg')" : "url('img/baseline-unfold_more-24px.svg')");
}

function shipToJSON(ship) {
  return {
    'id': ship.id(),
    'level': ship.level(),
    'name': ship.name(),
    'hp': ship.hp().numerator(),
    'maxhp': ship.hp().denominator(),
    'cond': ship.cond(),
    'next_exp': ship.next_exp(),
    'fuel': ship.fuel().numerator(),
    'bull': ship.bull().numerator(),
    'type': ship.type().value(),
    'karyoku': ship.karyoku().numerator(),
    'raisou': ship.raisou().numerator(),
    'taiku': ship.taiku().numerator(),
    'soukou': ship.soukou().numerator(),
    'lucky': ship.lucky().numerator(),
    'sakuteki': ship.sakuteki().numerator(),
    'taisen': ship.taisen().numerator(),
    'soku': ship.soku().value(),
    'repair': ship.repair_seconds(),
    'locked': ship.locked(),
    'remodel_completed': ship.remodel_completed(),
    'after_level': ship.after_level(),
    'is_mission': ship.is_mission(),
    'repair_seconds': ship.repair_seconds(),
    'sally_area': ship.sally_area().id(),
  };
};

function setQueryEnabled(query_enabled) {
  $('#use_query').prop('checked', query_enabled);

  $('#filter_panel input').each(function() {
    $(this).prop('disabled', query_enabled);
  });
  $('#filter_panel').css('pointer-events', query_enabled ? 'none' : 'auto');
  $('#sort_panel').css('pointer-events', query_enabled ? 'none' : 'auto');

  $('#filter_panel').css('opacity', query_enabled ? 0.5 : 1);
  $('#sort_panel').css('opacity', query_enabled ? 0.5 : 1);

  $('.QueryInputGroup').prop('disabled', !query_enabled);
  $('.QueryInputGroup').prop('readonly', !query_enabled);
  $('.QueryInputGroup').css('pointer-events', !query_enabled ? 'none' : 'auto');

  $('#query').css('user-select', query_enabled ? 'text' : 'none');
  $('#query').css('cursor', query_enabled ? 'auto' : 'default');

  if (query_enabled) {
    sort_order.forEach((it) => {
      unsetSortOrder($('#sort_order_' + it.key));
    });
  } else {
    applySort();
    applyFilter();
  }
  $('#ship_table_header').css('cursor', query_enabled ? 'default' : 'pointer');
}

function toggleQuery() {
  const query_enabled = $('#use_query').prop('checked');
  if (query_enabled) {
    $('#query_preset_choice').val('empty');
  }
  setQueryEnabled(query_enabled);
}

function queryChanged() {
  const query = createQueryAlasql();
  try {
    alasql.compile(query);
    $('#query').css('background-color', '#ddd');
  } catch (e) {
    $('#query').css('background-color', '#fdd');
  }
}

function queryDidEntered() {
  const query = createQueryAlasql();
  try {
    const compiled = alasql.compile(query);
  } catch (e) {
    return;
  }
  _query_history.append(createQueryDisplay());
  applyFilter();
}

function queryHistoryChanged() {
  const $select = $('#query_history_choice');
  $select.empty();
  const history = _query_history.history;
  const template = '<option value="{query}">{query}</option>';
  for (var i = history.length - 1; i >= 0; i--) {
    const query = history[i];
    $select.append(template.replace(/{query}/g, query));
  }
}

function queryHistorySelected() {
  const $select = $('#query_history_choice');
  const query = $select.val();
  const index = query.indexOf(_QUERY_PREFIX_DISPLAY);
  if (index != 0) {
    return;
  }
  $('#query').val(query.substring(index + _QUERY_PREFIX_DISPLAY.length));
  queryChanged();
  applyFilter();
}

function queryPresetSelected() {
  const $select = $('#query_preset_choice');
  const id = $select.val();
  const preset = _query_preset_list.presetById(id);
  if (preset == null) {
    return;
  }
  const sql = preset.sql;
  $('#query').val(sql);
  _query_history.append(_QUERY_PREFIX_DISPLAY + sql);
  applyFilter();
}

function registerSqlPreset() {
  const title = $('#preset_name').val();
  const sql_part = $('#query').val();
  const sql = _QUERY_PREFIX_ALASQL + sql_part;
  var error_messages = [];

  try {
    alasql.compile(sql);
  } catch (e) {
    error_messages.push('SQL にエラーがあります.');
  }

  if (title.length == 0) {
    error_messages.push('プリセット名を設定してください.');
  }

  if (error_messages.length > 0) {
    var {dialog} = require('electron').remote;
    const opt = {
      type: 'error',
      title: 'エラー',
      message: error_messages.join('\n')
    };
    dialog.showMessageBox(opt);
    return;
  }

  _query_preset_list.append(title, sql_part);
}

function deleteSqlPreset() {
  const $select = $('#query_preset_choice');
  const id = $select.val();
  if (_query_preset_list.isBuiltin(id)) {
    return;
  }
  $select.val('empty');
  _query_preset_list.remove(id);
}
