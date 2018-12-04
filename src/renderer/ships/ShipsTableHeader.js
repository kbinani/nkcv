'use strict;'

const {ipcRenderer, remote} = require('electron');
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

const i18n = require(__dirname + '/../../i18n.js');
const _ = require('lodash');

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
    const sortKeys = [
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
    this._sortKeys = sortKeys;
    for (let i = 1; i < sortKeys.length; i++) {
      const prev = sortKeys[i - 1];
      const element = sortKeys[i];
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

      const header = document.getElementById(`header_${element.key}`);
      header.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menu = new Menu();
        menu.append(new MenuItem({
          label: i18n.__('Hide this column'),
          click: (e) => {
            this.hideColumn(element.key);
            this.notifyColumnVisibility();
          },
        }));
        menu.append(new MenuItem({type: 'separator'}));
        menu.append(new MenuItem({
          label: i18n.__('Show all hidden columns'),
          click: (e) => {
            this._columnVisibility = {};
            this.updateColumnVisibility();
            this.notifyColumnVisibility();
          },
        }));
        menu.popup(remote.getCurrentWindow());
      });
    }

    this._columnWidth = {};
    this._columnVisibility = {};
  }

  get columnWidth() {
    return this._columnWidth;
  }

  set columnWidth(columnWidth) {
    for (let key in columnWidth) {
      const width = columnWidth[key];
      this.updateWidth(key, width);
    }
  }

  width(key) {
    return $(`#header_${key}`).width();
  }

  updateWidth(key, width) {
    $(`.column_${key}`).css('min-width', `${width}px`);
    $(`.column_${key}`).css('max-width', `${width}px`);
    this._columnWidth[key] = width;
  }

  updateWidthAll() {
    for (let key in this._columnWidth) {
      const width = this._columnWidth[key];
      this.updateWidth(key, width);
    }
  }

  get columnVisibility() {
    return this._columnVisibility;
  }

  set columnVisibility(columnVisibility) {
    this._columnVisibility = columnVisibility;
    this.updateColumnVisibility();
  }

  hideColumn(key) {
    $(`.column_${key}`).css('display', 'none');
    this._columnVisibility[key] = false;
  }

  updateColumnVisibility() {
    this._sortKeys.forEach((it) => {
      const key = it.key;
      const visible = _.get(this._columnVisibility, [key], true);
      if (visible) {
        $(`.column_${key}`).css('display', 'table-cell');
      } else {
        $(`.column_${key}`).css('display', 'none');
      }
    });
  }

  notifyColumnVisibility() {
    ipcRenderer.send('app.patchConfig', {'shipWindow.ColumnVisibility': this._columnVisibility});
  }
}

module.exports = ShipsTableHeader;
