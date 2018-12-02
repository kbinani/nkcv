'use strict;'

const SallyArea = require(__dirname + '/../../SallyArea.js'),
      ShipType = require(__dirname + '/../../ShipType.js'),
      i18n = require(__dirname + '/../../i18n.js');

class FilterPanel {
  constructor() {
    this._initSallyArea();
    this._initShipType();
  }

  _initSallyArea() {
    SallyArea.load_remote_mapping(() => {
      const $container = $('#sally_area_choices');
      const template = `
        <label for="sally_area_{id}" style="display: block; height: 25px; line-height: 25px; margin-right: 10px; white-space: nowrap; background-color: {background_color}; color: {text_color}; min-width: 80px; flex: 0 0 auto; vertical-align: middle;">
          <input id="sally_area_{id}" type="checkbox" onclick="sallyAreaCheckboxClicked()" checked="checked"/><span id="sally_area_{id}" style="margin-right: 10px;">{name}</span>
        </label>`;
      const allSallyAreas = SallyArea.allCases();
      $container.empty();
      if (allSallyAreas.length > 1) {
        allSallyAreas.forEach((it) => {
          const name = it.name();
          const element = template.replace(/{id}/g, it.id())
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
  }

  _initShipType() {
    const choices = $('#ship_type_choices');
    const template = `
      <label for="ship_type_{id}" style="height: 25px; line-height: 25px; margin-right: 10px; white-space: nowrap;">
        <input id="ship_type_{id}" type="checkbox" onclick="_ships_window.shipTypeCheckboxClicked()" checked="checked"/><span id="ship_type_{id}_label" data-i18n="{name_key}">{name}</span>
      </label>`
    ShipType.allCases().forEach((type) => {
      const element = template.replace(/{id}/g, type.value())
                              .replace(/{name}/g, i18n.__(`shiptype.${type.toString()}`))
                              .replace(/{name_key}/g, `shiptype.${type.toString()}`);
      choices.append(element);
    });
  }
}

module.exports = FilterPanel;
