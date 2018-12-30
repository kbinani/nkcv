'use strict;'

window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen} = require('electron');
const Port = require(__dirname + '/../../Port.js'),
      Master = require(__dirname + '/../../Master.js'),
      DataStorage = require(__dirname + '/../../DataStorage.js'),
      ShipType = require(__dirname + '/../../ShipType.js'),
      SallyArea = require(__dirname + '/../../SallyArea.js'),
      QueryHistory = require(__dirname + '/../../QueryHistory.js'),
      QueryPresetList = require(__dirname + '/../../QueryPresetList.js'),
      shared = require(__dirname + '/../../../shared.js'),
      i18n = require(__dirname + '/../../i18n.js'),
      FilterPanel = require(__dirname + '/FilterPanel.js'),
      ShipsTableHeader = require(__dirname + '/ShipsTableHeader.js');
const sprintf = require('sprintf'),
      _ = require('lodash'),
      alasql = require('alasql');

const _QUERY_PREFIX_DISPLAY = 'SELECT * FROM ships WHERE ';
const _QUERY_PREFIX_ALASQL = 'SELECT id FROM ? WHERE ';

class ShipsWindow {
  constructor() {
    require('electron-disable-file-drop');

    this._storage = new DataStorage();
    this._ships = [];
    this._sort_order_key = ['id', 'type', 'name', 'ship_class', 'level', 'cond', 'karyoku', 'raisou', 'taiku', 'soukou', 'lucky', 'sakuteki', 'taisen', 'soku', 'sally_area', 'repair_seconds'];
    this._sort_order = [
      {'key': 'level', 'is_descending': false},
    ];
    this._sort_order_inverted = false;
    this._query_history = new QueryHistory(50);
    this._query_preset_list = new QueryPresetList({});
    this._filter_config_received = false;
    this._sort_config_received = false;
    this._sql_preset_list_received = false;

    this.language = "ja";
    i18n.setLocale(this.language);

    this._filterPanel = new FilterPanel();
    this._tableHeader = new ShipsTableHeader();
    this.setQueryEnabled(false);

    $('#query').bind('input propertychange', () => {
      this.queryChanged();
    });

    $('#query').keypress((e) => {
      if (e.which == 13) {
        this.queryDidEntered();
        return false;
      }
    });

    this._query_history.onChange = () => {
      this.queryHistoryChanged();
    };

    this._query_preset_list.onChange = () => {
      this.loadQueryPresetList();
      if (this._sql_preset_list_received) {
        ipcRenderer.send('app.patchConfig', {'sqlPresetList': this._query_preset_list.toJSON()});
      }
    };

    ipcRenderer.on('app.shipWindowSort', (event, data) => {
      this._sort_order.splice(0, this._sort_order.length);
      const sort = _.get(data, ['orders'], []);
      sort.forEach((it) => {
        this._sort_order.push(it);
      });
      this._sort_order_inverted = _.get(data, ['inverted'], false);
      this.applySort();
      this._sort_config_received = true;
    });

    ipcRenderer.on('app.shipWindowFilter', (event, data) => {
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
      this._filter_config_received = true;
    });

    ipcRenderer.on('app.sqlPresetList', (event, data) => {
      // ここは 1 回しか来ないはず
      this._query_preset_list.patch(data);
      this.loadQueryPresetList();
      this._sql_preset_list_received = true;
    });

    window.addEventListener('mousemove', (e) => {
      this.onMouseMove(e);
    });
    window.addEventListener('mouseup', (e) => {
      this.onMouseUp(e);
    });

    this.subscribe();
    ipcRenderer.send('app.shipWindowDidLoad', {});
  }

  subscribe() {
    ipcRenderer.on('app.languageDidChanged', (event, data) => {
      const language = data;
      this.setLanguage(language);
    });

    this._storage.on('port', (port) => {
      this.update(port.ships);
    });

    ipcRenderer.on('app.shipWindowColumnWidth', (event, data) => {
      this._tableHeader.columnWidth = data;
    });

    ipcRenderer.on('app.shipWindowColumnVisibility', (event, data) => {
      this._tableHeader.columnVisibility = data;
    });
  }

  update(ships) {
    const removed_ships = _.differenceBy(this._ships, ships, (ship) => ship.id());
    const added_ships = _.differenceBy(ships, this._ships, (ship) => ship.id());

    removed_ships.forEach((ship) => {
      $('#ship_' + ship.id() + '_row').remove();
    });

    const $tbody = $('#ship_table');
    var appending = '';
    added_ships.forEach((ship) => {
      const element = this.createShipCell(ship);
      appending += element;
    });
    $tbody.append(appending);

    const before_lut = {};
    this._ships.forEach((ship) => {
      before_lut[ship.id()] = shared.shipToString(ship);
    });

    const after_lut = {};
    ships.forEach((ship) => {
      after_lut[ship.id()] = shared.shipToString(ship);
    });

    const existing_ships = _.intersectionBy(ships, this._ships, (ship) => ship.id());

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
      slotitem_ids.forEach((id) => {
        slotitem_container.append(this.createSlotitemCell(id));
      });
      shared.updateSlotitemStatus(slotitems);
    });

    shared.updateShipStatus(updated_ships);

    this._ships = ships.map((it) => it.clone());
    this.applySort();
    this.applyFilter();
    this._tableHeader.updateWidthAll();
    this._tableHeader.updateColumnVisibility();
  }

  applySort() {
    this._sort_order_key.forEach((key) => {
      this.unsetSortOrder($('#sort_order_' + key));
    });
    var index = 1;
    this._sort_order.forEach((it) => {
      const key = it.key;
      const is_descending = it.is_descending === true;
      this.setSortOrder($('#sort_order_' + key), index, is_descending);
      index++;
    });

    if (this._sort_config_received) {
      ipcRenderer.send('app.patchConfig', {
        'shipWindowSort': {
          'orders': this._sort_order,
          'inverted': this._sort_order_inverted
        }
      });
    }
  }

  applyFilter() {
    const config_filters = {};
    var where = [];

    // 艦種
    const included = ShipType.allCases().filter((type) => {
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
    for (var i = 0; i < this._sort_order.length; i++) {
      const it = this._sort_order[i];
      const key = it.key;
      order_by.push(key + (it.is_descending ? ' DESC' : ' ASC'));
      if (key == 'id') {
        contains_id_key = true;
      } else if (key == 'level') {
        order_by.push('next_exp ' + (it.is_descending ? 'ASC' : 'DESC'));
      } else if (key == 'ship_class') {
        order_by.push(`CAST(ship_class_order as int) ${it.is_descending ? 'DESC' : 'ASC'}`);
      }
    }
    if (!contains_id_key) {
      order_by.push('id ' + (this._sort_order_inverted ? 'DESC' : 'ASC'));
    }

    const query_enabled = $('#use_query').prop('checked');
    if (query_enabled) {
      query = this.createQueryAlasql();
    } else {
      var query_after_where = where.join(' AND ');
      if (order_by.length > 0) {
        query_after_where += ' ORDER BY ' + order_by.join(', ');
      }
      query = 'SELECT id FROM ? WHERE ' + query_after_where;
      $('#query').val(query_after_where);
    }

    const ships = this._ships.map((ship) => {
      return this.shipToJSON(ship);
    });
    var compiled = null;
    try {
      compiled = alasql.compile(query);
    } catch (e) {
      console.trace(e);
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

    if (this._filter_config_received) {
      ipcRenderer.send('app.patchConfig',{'shipWindowFilter': config_filters});
    }
  }

  setQueryEnabled(query_enabled) {
    $('#use_query').prop('checked', query_enabled);

    $('#filter_panel input').each((_, element) => {
      $(element).prop('disabled', query_enabled);
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
      this._sort_order.forEach((it) => {
        this.unsetSortOrder($('#sort_order_' + it.key));
      });
    } else {
      this.applySort();
      this.applyFilter();
    }
    $('#ship_table_header').css('cursor', query_enabled ? 'default' : 'pointer');
  }

  shipTypeCheckboxClicked() {
    ShipType.allCases().forEach(function(type) {
      const checkbox = $('#ship_type_' + type.value());
    });
    this.applyFilter();
  }

  setLanguage(language) {
    this.language = language;
    i18n.setLocale(language);

    shared.applyLanguageToView(language);
  }

  loadQueryPresetList() {
    const preset_list = this._query_preset_list.list;
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
  }

  selectShipType(types) {
    ShipType.allCases().forEach(function(type) {
      const checkbox = $('#ship_type_' + type.value());
      const check = types.indexOf(type.value()) >= 0;
      checkbox.prop('checked', check);
    });
    this.applyFilter();
  }

  unsetSortOrder($element) {
    $element.css('display', 'none');
  }

  setSortOrder($element, order_index, is_descending) {
    if (order_index < 0) {
      unsetSortOrder($element);
    } else {
      $element.css('display', 'block');
      $element.html(order_index + (is_descending ? "▼" : "▲"));
    }
  }

  resetSortOrder() {
    this._sort_order.splice(0, this._sort_order.length);
    this._sort_order_inverted = false;
    this.applySort();
    this.applyFilter();
  }

  createShipCell(ship) {
    const template = `
      <div id="ship_{ship_id}_row" class="ThemeTableRow" style="display: table-row;">
        <div class="ThemeTableCell column_index" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_index"></span>
          </div>
        </div>
        <div class="ThemeTableCell column_id" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">{ship_id}</div>
        </div>
        <div class="ThemeTableCell column_type" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_type" data-i18n="{type_key}">{type}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_name" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_name" data-i18n="{name}">{localized_name}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_ship_class" title="{class}" data-i18n="{class_key}" data-i18n-attribute="title" data-i18n-format="{class_format}">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_ship_class" data-i18n="{class_key}" data-i18n-format="{class_format}">{class}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_level" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            Lv. <span class="ship_{ship_id}_level">{level}</span> Next: <span class="ship_{ship_id}_next_exp">{next_exp}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_cond" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <div class="ship_{ship_id}_cond_icon"></div>
            <span class="ship_{ship_id}_cond">{cond}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_karyoku" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_karyoku">{karyoku}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_raisou" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_raisou">{raisou}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_taiku" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_taiku">{taiku}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_soukou" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_soukou">{soukou}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_lucky" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_lucky">{lucky}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_sakuteki" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_sakuteki">{sakuteki}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_taisen" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_taisen">{taisen}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_soku" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_soku" data-i18n="{soku}">{localized_soku}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_sally_area" sylte="vertical-align: middle; overflow: hidden;">
          <div style="display: flex; height: 25px; line-height: 25px; margin: 0 5px 0 5px;">
            <div class="ship_{ship_id}_sally_area FontNormal" style="flex: 1 1 auto; height: 19px; line-height: 19px; margin-top: 3px; margin-bottom: 3px; color: {sally_area_text_color}; background-color: {sally_area_background_color}; text-align: center; vertical-align: middle; padding: 0px 5px 0px 5px;">{sally_area}</div>
          </div>
        </div>
        <div class="ThemeTableCell column_repair" style="overflow: hidden;">
          <div style="margin: 0 5px 0 5px;">
            <span class="ship_{ship_id}_repair">{repair}</span>
          </div>
        </div>
        <div class="ThemeTableCell column_slotitem" style="height: 25px; vertical-align: middle; overflow: hidden;">
          <div class="ship_{ship_id}_slotitem" style="margin: 0 5px 0 5px;">
          </div>
        </div>
        <div class="ThemeTableCell" style="overflow: hidden; display: flex;">
          <div style="flex: 1 1 auto;"><!-- spacer --></div>
        </div>
      </div>`;
    const sally_area = ship.sally_area();
    const order = ship.ship_class_order();
    let ship_class = i18n.__(`shipclass.${ship.ship_class()}`);
    let ship_class_format = '%s';
    if (order != "") {
      ship_class += `(${order})`;
      ship_class_format += `(${order})`;
    }
    return template.replace(/{ship_id}/g, ship.id())
                   .replace(/{level}/, ship.level())
                   .replace(/{type}/g, i18n.__(`shiptype.${ship.type().toString()}`))
                   .replace(/{type_key}/g, `shiptype.${ship.type().toString()}`)
                   .replace(/{class}/g, ship_class)
                   .replace(/{class_key}/g, `shipclass.${ship.ship_class()}`)
                   .replace(/{class_format}/g, ship_class_format)
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
                   .replace(/{soku}/, `speed.${ship.soku().toString()}`)
                   .replace(/{localized_soku}/g, i18n.__(`speed.${ship.soku().toString()}`))
                   .replace(/{repair}/, ship.repair_seconds() > 0 ? shared.timeLabel(ship.repair_seconds()) : '')
                   .replace(/{sally_area}/, ship.sally_area().name())
                   .replace(/{sally_area_background_color}/, sally_area.id() == 0 ? 'transparent' : sally_area.background_color())
                   .replace(/{sally_area_text_color}/, sally_area.text_color())
                   .replace(/{localized_name}/g, i18n.__(ship.name()));
  }

  createSlotitemCell(slotitem_id) {
    if (slotitem_id == -1) {
      return '<div class="ThemeContainerBorderL" style="flex: 0 0 auto; width: 1px; height: 21px; margin: 2px 2px 0px 0px;"></div>';
    } else {
      const template = `
        <div title="12.7cm連装砲" class="slotitem_{slotitem_id}_icon" style="display: flex; flex-direction: column; flex: 0 0 auto; width: 21px; height: 21px; background-size: contain; background-repeat: no-repeat; background-position: 50%; margin-left: 3px; margin-right: 3px;">
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

  invertSortOrder() {
    this._sort_order.forEach((it) => it.is_descending = !it.is_descending);
    this._sort_order_inverted = !this._sort_order_inverted;
    this.applySort();
    this.applyFilter();
  }

  sortOrderClicked(key) {
    const query_enabled = $('#use_query').prop('checked');
    if (query_enabled) {
      return;
    }

    const index = _.findIndex(this._sort_order, function(it) { return it.key == key; });
    if (index >= 0) {
      const existing = this._sort_order[index];
      existing.is_descending = !existing.is_descending;
    } else {
      if (this._sort_order.length == 0 && key == 'id') {
        this._sort_order.push({'key': key, 'is_descending': true});
      } else {
        this._sort_order.push({'key': key, 'is_descending': false});
      }
    }
    this.applySort();
    this.applyFilter();
  }

  togglePanel(panel_title_id, panel_id) {
    const current_visible = $('#' + panel_id).css('display') == 'flex';
    $('#' + panel_id).css('display', current_visible ? 'none' : 'flex');
    $('#' + panel_title_id).css('background-image', current_visible ? "url('img/baseline-unfold_less-24px.svg')" : "url('img/baseline-unfold_more-24px.svg')");
  }

  shipToJSON(ship) {
    let ship_class = ship.ship_class();
    const ship_class_order = ship.ship_class_order();
    if (ship_class_order != "") {
      ship_class += `(${ship_class_order})`;
    }
    return {
      'id': ship.id(),
      'level': ship.level(),
      'ship_class': ship.ship_class(),
      'ship_class_order': ship.ship_class_order(),
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
      'repair_milliseconds': ship.repair_seconds() * 1000,
      'sally_area': ship.sally_area().id(),
    };
  };

  toggleQuery() {
    const query_enabled = $('#use_query').prop('checked');
    if (query_enabled) {
      $('#query_preset_choice').val('empty');
    }
    this.setQueryEnabled(query_enabled);
  }

  queryChanged() {
    const query = this.createQueryAlasql();
    try {
      alasql.compile(query);
      $('#query').css('background-color', '#ddd');
    } catch (e) {
      $('#query').css('background-color', '#fdd');
    }
  }

  queryDidEntered() {
    const query = this.createQueryAlasql();
    try {
      const compiled = alasql.compile(query);
    } catch (e) {
      return;
    }
    this._query_history.append(this.createQueryDisplay());
    this.applyFilter();
  }

  queryHistoryChanged() {
    const $select = $('#query_history_choice');
    $select.empty();
    const history = this._query_history.history;
    const template = '<option value="{query}">{query}</option>';
    for (var i = history.length - 1; i >= 0; i--) {
      const query = history[i];
      $select.append(template.replace(/{query}/g, query));
    }
  }

  queryHistorySelected() {
    const $select = $('#query_history_choice');
    const query = $select.val();
    const index = query.indexOf(_QUERY_PREFIX_DISPLAY);
    if (index != 0) {
      return;
    }
    $('#query').val(query.substring(index + _QUERY_PREFIX_DISPLAY.length));
    this.queryChanged();
    this.applyFilter();
  }

  queryPresetSelected() {
    const $select = $('#query_preset_choice');
    const id = $select.val();
    const preset = this._query_preset_list.presetById(id);
    if (preset == null) {
      return;
    }
    const sql = preset.sql;
    $('#query').val(sql);
    this._query_history.append(_QUERY_PREFIX_DISPLAY + sql);
    this.applyFilter();
  }

  registerSqlPreset() {
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

    this._query_preset_list.append(title, sql_part);
  }

  deleteSqlPreset() {
    const $select = $('#query_preset_choice');
    const id = $select.val();
    if (this._query_preset_list.isBuiltin(id)) {
      return;
    }
    $select.val('empty');
    this._query_preset_list.remove(id);
  }

  createQueryDisplay() {
    return _QUERY_PREFIX_DISPLAY + $('#query').val();
  }

  createQueryAlasql() {
    return _QUERY_PREFIX_ALASQL + $('#query').val();
  }

  abortColumnResize() {
    this._tableHeader.abortColumnResize();
  }

  onColumnResizeStart(event, key, position) {
    this._tableHeader.onColumnResizeStart(key, position, event.clientX);
  }

  onMouseMove(event) {
    this._tableHeader.onMouseMove(event.clientX);
  }

  onMouseUp(event) {
    this._tableHeader.onMouseUp(event.clientX);
  }

  sallyAreaCheckboxClicked(event) {
    this.applyFilter();
  }
}

module.exports = ShipsWindow;
