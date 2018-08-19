const isDev = require('electron-is-dev');
window.jQuery = window.$ = require('jquery');
const {ipcRenderer} = require('electron');
const Port = require('./src/Port.js');

const width = 1200;
const height = 720;
var scale = 1;

function onload() {
  const webview = document.querySelector("webview");
  webview.addEventListener("dom-ready", function() {
    applyScale();
    if (isDev) {
      webview.openDevTools();
    }
  });

  webview.addEventListener("will-navigate", function(data) {
    $("#browser_url").val(data.url);
  });

  webview.addEventListener("did-navigate", function(data) {
    $("#browser_url").val(data.url);
  });
}

function menuItemClicked(sender) {
  const menu_id = $(sender).attr("data-menu-id");

  $("#menu_container").children().each(function() {
    const menu = $(this);
    if (menu.attr("data-menu-id") == menu_id) {
      menu.addClass("ThemeContainerActive")
      menu.removeClass("ThemeContainerBorderR");
    } else {
      menu.removeClass("ThemeContainerActive");
      menu.addClass("ThemeContainerBorderR");
    }
  });

  $("#tool_container").children().each(function() {
    const tool = $(this);
    if (tool.attr("id") == menu_id) {
      tool.addClass("ToolPanelActive");
    } else {
      tool.removeClass("ToolPanelActive");
    }
  });
}

function browserBackClicked(sender) {
  document.querySelector("webview").goBack();
}

function browserReloadClicked(sender) {
  document.querySelector("webview").reload();
}

function updateScale(s) {
  scale = s;
  applyScale();
}

function applyScale() {
  const webview = document.querySelector("webview");
  webview.setZoomFactor(scale);
  $("#container").css("min-width", (width * scale) + "px");
  $("#webview_container").css("flex", "0 0 " + (height * scale) + "px");
  $("#wv").css("width", (width * scale) + "px");
  $("#wv").css("height", (height * scale) + "px");
}

ipcRenderer.on('port', function(event, data) {
  const masterData = data['master'];
  const portData = data['port'];
  const port = new Port(portData, masterData);

  for (var i = 0; i < port.decks.length; i++) {
    const deck = port.decks[i];
    const container = $('#deck_' + i + '_ships');
    container.empty();
    for (var i = 0; i < deck.ships.length; i++) {
      const ship = deck.ships[i];
      const html = createDeckShipCell(ship.id());
      container.append(html);
    }
  }

  updateShipStatus(port.ships);
});

function updateShipStatus(ships) {
  ships.forEach(function(ship) {
    const id = ship.id();
    $('#ship_' + id + '_level').html(ship.level());
    $('#ship_' + id + '_name').html(ship.name());

    const hp = ship.hp();
    $('#ship_' + id + '_hp_numerator').html(hp.numerator());
    $('#ship_' + id + '_hp_denominator').html(hp.denominator());
    $('#ship_' + id + '_hp_percentage').css('width', (hp.value() * 100) + '%');
    $('#ship_' + id + '_hp_percentage').css('background-color', barColor(hp));

    const cond = ship.cond();
    $('#ship_' + id + '_cond').html(ship.cond());
    const condIconColor = cond > 49 ? 'yellow' : 'white';
    $('#ship_' + id + '_cond_icon').css('background-color', condIconColor);

    $('#ship_' + id + '_next_exp').html(ship.next_exp());

    const fuel = ship.fuel();
    $('#ship_' + id + '_fuel_percentage').css('width', (fuel.value() * 100) + '%');
    $('#ship_' + id + '_fuel_percentage').css('background-color', barColor(fuel));

    const bull = ship.bull();
    $('#ship_' + id + '_bull_percentage').css('width', (bull.value() * 100) + '%');
    $('#ship_' + id + '_bull_percentage').css('background-color', barColor(bull));
  });
}

function barColor(rat) {
  return rat.value() >= 0.75 ? '#0f0' : (rat.value() >= 0.5 ? 'yellow' : (rat.value() >= 0.25 ? 'orange' : 'red'));
}

function createDeckShipCell(ship_id) {
  const template = '\
    <tr class="DeckShipCell ThemeContainerBorderB">\
      <td id="ship_{ship_id}_type" style="padding: 5px;" nowrap>艦種</td>\
      <td id="ship_{ship_id}_name" style="padding: 5px; font-size: 20px;" nowrap>艦名</td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto;">Lv. <span id="ship_{ship_id}_level">1</span></div>\
          <div style="flex: 1 1 auto;">Next: <span id="ship_{ship_id}_next_exp">100</span></div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto;">HP: <span id="ship_{ship_id}_hp_numerator">999</span> / <span id="ship_{ship_id}_hp_denominator">999</span></div>\
          <div style="flex: 0 0 5px;"></div>\
          <div style="flex: 1 1 auto; display: flex;">\
            <div style="flex: 1 1 auto; height: 8px; width: 60px; background-color: white;">\
              <div id="ship_{ship_id}_hp_percentage" style="height: 8px; width: 50%; background-color: blue;"></div></div>\
          </div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto; display: flex;">\
            <div id="ship_{ship_id}_cond_icon" style="flex: 0 0 auto; width: 15px; height: 15px; background-color: white; margin-right: 5px;"></div>\
            <div id="ship_{ship_id}_cond" style="flex: 1 1 auto;">49</div>\
          </div>\
          <div>condition</div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 0 0 auto; width: 80px; height: 8px; background-color: white;">\
            <div id="ship_{ship_id}_fuel_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>\
          </div>\
          <div style="flex: 0 0 auto; height: 5px;"></div>\
          <div style="flex: 0 0 auto; width: 80px; height: 8px; background-color: white;">\
            <div id="ship_{ship_id}_bull_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>\
          </div>\
        </div>\
      </td>\
      <td style="padding: 5px; overflow: hidden;" width="99999">\
        <div style="display: flex; background-color: red;"></div>\
      </td>\
    </tr>';
    return template.replace(/\{ship_id\}/g, ship_id);
}
