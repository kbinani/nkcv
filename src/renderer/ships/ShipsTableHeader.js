'use strict;'

const i18n = require(__dirname + '/../../i18n.js');

class ShipsTableHeader {
  constructor() {
    const template =
     `<div id="header_{key}" class="ThemeTableHeader column_{key}">
        <div style="display: flex;">
          <div class="ColumnResizer ThemeContainerBorderL" onmousedown="_ships_window.onColumnResizeStart(event, '{prev_key}')"></div>
          <div class="ColumnLabelContainer" onclick="_ships_window.sortOrderClicked('{key}')">
            <div class="TableHeaderKey" style="flex: 1 1 auto;" data-i18n="{display}">{translated_display}</div>
            <div id="sort_order_{key}" class="TableHeaderSortOrder" style="flex: 0 0 auto; display: none;"></div>
          </div>
          <div class="ColumnResizer" onmousedown="_ships_window.onColumnResizeStart(event, '{key}')"></div>
        </div>
      </div>`;
    const $header = $('#ship_table_header');
    const sort_keys = [
      {key: 'index',          display: '',                translate: false, sortable: false},
      {key: 'id',             display: 'ID',              translate: false, sortable: true},
      {key: 'type',           display: 'Ship.Type',       translate: true,  sortable: true},
      {key: 'name',           display: 'Ship.Name',       translate: true,  sortable: true},
      {key: 'ship_class',     display: 'Ship.Class',      translate: true,  sortable: true},
      {key: 'level',          display: 'Level',           translate: true,  sortable: true},
      {key: 'cond',           display: 'cond',            translate: false, sortable: true},
      {key: 'karyoku',        display: 'Ship.Firepower',  translate: true,  sortable: true},
      {key: 'raisou',         display: 'Ship.Torpedo',    translate: true,  sortable: true},
      {key: 'taiku',          display: 'Ship.AA',         translate: true,  sortable: true},
      {key: 'soukou',         display: 'Ship.Armor',      translate: true,  sortable: true},
      {key: 'lucky',          display: 'Ship.Luck',       translate: true,  sortable: true},
      {key: 'sakuteki',       display: 'Ship.LoS',        translate: true,  sortable: true},
      {key: 'taisen',         display: 'Ship.ASW',        translate: true,  sortable: true},
      {key: 'soku',           display: 'Ship.Speed',      translate: true,  sortable: true},
      {key: 'sally_area',     display: 'Event Maps',      translate: true,  sortable: false},
      {key: 'repair_seconds', display: 'Repair duration', translate: true,  sortable: true},
      {key: 'slotitems',      display: 'Equipments',      translate: true,  sortable: false},
    ];
    for (let i = 1; i < sort_keys.length; i++) {
      const prev = sort_keys[i - 1];
      const element = sort_keys[i];
      const html = template.replace(/{key}/g, element.key)
                           .replace(/{prev_key}/g, prev.key)
                           .replace(/{display}/g, element.display)
                           .replace(/{translated_display}/g, element.translate ? i18n.__(element.display) : element.display);
      $header.append(html);
      if (element.sortable == false) {
        $(`#header_${element.key} .ColumnLabelContainer`).removeAttr('onclick');
      }
      if (element.translate == false) {
        $(`#header_${element.key} .TableHeaderKey`).removeAttr('data-i18n');
      }
    }

    this._width = {};
  }

  width(key) {
    return $(`#header_${key}`).width();
  }

  updateWidth(key, width) {
    $(`.column_${key}`).css('min-width', `${width}px`);
    $(`.column_${key}`).css('max-width', `${width}px`);
    this._width[key] = width;
  }
}

module.exports = ShipsTableHeader;
