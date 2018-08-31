window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen} = require('electron');
const Port = require('./src/Port.js'),
      Master = require('./src/Master.js'),
      DataStorage = require('./src/DataStorage.js');
const sprintf = require('sprintf');

const width = 1200;
const height = 720;
var scale = 1;
const storage = new DataStorage();

function onload() {
  const webview = document.querySelector("webview");
  webview.addEventListener("dom-ready", function() {
    applyScale();
  });

  webview.addEventListener("will-navigate", function(data) {
    $("#browser_url").val(data.url);
  });

  webview.addEventListener("did-navigate", function(data) {
    $("#browser_url").val(data.url);
  });

  storage.on('port', function(port) {
    updateDeckStatus(port.decks);
    updateShipStatus(port.ships);
    port.ships.forEach(function(ship) {
      const slotitems = ship.slotitems();
      slotitems.forEach(function(it) {
        const slotitemCell = createDeckShipSlotitemCell(it.id());
        $('.ship_' + ship.id() + '_slotitem').append(slotitemCell);
      });
      updateSlotitemStatus(slotitems);
    });

    $('#user_name').html(port.nickname());
    $('#user_level').html(port.level());
    $('#user_comment').html(port.comment());
    $('#user_rank').html(port.rank());
  });

  setInterval(function() {
    const now = new Date();
    $('.CountdownLabel').each(function() {
      const finish = $(this).attr('data-timer-finish');
      if (!finish) {
        return;
      }
      const remaining = finish - now.getTime();
      if (remaining <= 0) {
        $(this).removeClass('CountdownLabel');
        $(this).html('');
      } else {
        const label = timeLabel(remaining);
        $(this).html(label);
      }
    });
  }, 1000);
}

function updateDeckStatus(decks) {
  const kanji = ['一', '二', '三', '四'];
  for (var i = 0; i < decks.length; i++) {
    const deck = decks[i];
    const container = $('#deck_' + i + '_ships');
    container.empty();
    const general_deck_container = $('#general_deck_' + i + '_ships');
    general_deck_container.empty();
    for (var j = 0; j < deck.ships.length; j++) {
      const ship = deck.ships[j];

      const html = createDeckShipCell(ship.id());
      container.append(html);

      const general = createGeneralShipCell(ship.id());
      general_deck_container.append(general);
    }

    const name = deck.name();
    $('.deck_' + i + '_title').html(name.length == 0 ? '第' + kanji[i] + '艦隊' : name);

    const mission_finish_time = deck.mission_finish_time();
    var color = "";
    if (mission_finish_time) {
      color = 'blue';
      $('.deck_' + i + '_countdown').attr('data-timer-finish', mission_finish_time.getTime());
      $('.deck_' + i + '_countdown').addClass('CountdownLabel');
    } else {
      if (deck.in_combat) {
        color = 'red';
      } else if (deck.is_ready_to_sally()) {
        color = '#00CC00';
      } else {
        color = 'orange';
      }
      $('.deck_' + i + '_countdown').removeClass('CountdownLabel');
    }
    $('.deck_' + i + '_icon').css('background-color', color);
  }
}

function menuItemClicked(sender) {
  const menu_id = $(sender).attr("data-menu-id");

  $("#menu_container").children().each(function() {
    const menu = $(this);
    if (menu.attr("data-menu-id") == menu_id) {
      menu.addClass("ThemeContainerActive")
      menu.removeClass("ThemeContainerBorderR");
      menu.css('cursor', 'default');
    } else {
      menu.removeClass("ThemeContainerActive");
      menu.addClass("ThemeContainerBorderR");
      menu.css('cursor', 'pointer');
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

function createDeckShipCell(ship_id) {
  const template = '\
    <tr class="DeckShipCell ThemeContainerBorderB">\
      <td class="ship_{ship_id}_type FontNormal" style="padding: 5px;" nowrap>艦種</td>\
      <td class="ship_{ship_id}_name FontLarge" style="padding: 5px;" nowrap>艦名</td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto;">Lv. <span class="ship_{ship_id}_level">1</span></div>\
          <div style="flex: 1 1 auto;">Next: <span class="ship_{ship_id}_next_exp">100</span></div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto;">HP: <span class="ship_{ship_id}_hp_numerator">999</span> / <span class="ship_{ship_id}_hp_denominator">999</span></div>\
          <div style="flex: 0 0 5px;"></div>\
          <div style="flex: 1 1 auto; display: flex;">\
            <div style="flex: 1 1 auto; height: 8px; width: 60px; background-color: white;">\
              <div class="ship_{ship_id}_hp_percentage" style="height: 8px; width: 50%; background-color: blue;"></div></div>\
          </div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 1 1 auto; display: flex;">\
            <div class="ship_{ship_id}_cond_icon" style="flex: 0 0 auto; width: 12px; height: 12px; background-color: white; margin: auto;"></div>\
            <div class="ship_{ship_id}_cond" style="flex: 1 1 auto; margin-left: 5px;">49</div>\
          </div>\
          <div>condition</div>\
        </div>\
      </td>\
      <td style="padding: 5px;" nowrap>\
        <div style="display: flex; flex-direction: column;">\
          <div style="flex: 0 0 auto; width: 60px; height: 8px; background-color: white;">\
            <div class="ship_{ship_id}_fuel_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>\
          </div>\
          <div style="flex: 0 0 auto; height: 5px;"></div>\
          <div style="flex: 0 0 auto; width: 60px; height: 8px; background-color: white;">\
            <div class="ship_{ship_id}_bull_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>\
          </div>\
        </div>\
      </td>\
      <td style="padding: 5px; overflow: hidden;">\
        <div class="ship_{ship_id}_slotitem" style="display: flex;">\
        </div>\
      </td>\
      <td style="padding: 5px; overflow: hidden;" width="99999"></td>\
    </tr>';
    return template.replace(/\{ship_id\}/g, ship_id);
}

function createDeckShipSlotitemCell(slotitem_id) {
  const template = '<div title="12.7cm連装砲" class="slotitem_{slotitem_id}_icon" style="flex: 0 0 30px; width: 30px; height: 30px; background-image: url(\'img/main_canon_light.svg\'); background-size: contain; background-repeat: no-repeat; background-position: 50%; margin-left: 3px; margin-right: 3px;"></div>';
  return template.replace(/\{slotitem_id\}/g, slotitem_id);
}

function createGeneralShipCell(ship_id) {
  const template = `
    <tr class="DeckShipCell ThemeContainerBorderB">
      <td class="ship_{ship_id}_name" style="padding: 5px;" nowrap>艦名</td>
      <td style="padding: 5px;" nowrap>
        <div style="display: flex; flex-direction: column;">
          <div style="flex: 1 1 auto;">Lv. <span class="ship_{ship_id}_level">1</span></div>
          <div style="flex: 1 1 auto;">Next: <span class="ship_{ship_id}_next_exp">100</span></div>
        </div>
      </td>
      <td style="padding: 5px;" nowrap>
        <div style="display: flex; flex-direction: column;">
          <div style="flex: 1 1 auto;">HP: <span class="ship_{ship_id}_hp_numerator">999</span> / <span class="ship_{ship_id}_hp_denominator">999</span></div>
          <div style="flex: 0 0 5px;"></div>
          <div style="flex: 1 1 auto; display: flex;">
            <div style="flex: 1 1 auto; height: 8px; width: 60px; background-color: white;">
              <div class="ship_{ship_id}_hp_percentage" style="height: 8px; width: 50%; background-color: blue;"></div></div>
          </div>
        </div>
      </td>
      <td style="padding: 5px;" nowrap>
        <div style="display: flex; flex-direction: column;">
          <div style="flex: 1 1 auto; display: flex;">
            <div class="ship_{ship_id}_cond_icon" style="flex: 0 0 auto; width: 12px; height: 12px; background-color: white; margin: auto;"></div>
            <div class="ship_{ship_id}_cond" style="flex: 1 1 auto; margin-left: 5px;">49</div>
          </div>
          <div>condition</div>
        </div>
      </td>
      <td style="padding: 5px; overflow: hidden;">
        <div class="ship_{ship_id}_slotitem" style="display: flex;">
        </div>
      </td>
    </tr>`
  return template.replace(/\{ship_id\}/g, ship_id);
}

function deckMenuClicked(index) {
  for (var i = 0; i < 4; i++) {
    const id = '#deck_' + i + '_ships';
    const menuId = '#deck_' + i + '_menu';
    if (i == index) {
      $(id).removeClass('DeckTable');
      $(id).addClass('DeckTableActive');

      $(menuId).removeClass('ThemeContainer');
      $(menuId).addClass('ThemeContainerActive');
      $(menuId).removeClass('ThemeContainerBorderB');
      $(menuId).css('cursor', 'default');
    } else {
      $(id).addClass('DeckTable');
      $(id).removeClass('DeckTableActive');

      $(menuId).removeClass('ThemeContainerActive');
      $(menuId).addClass('ThemeContainer');
      $(menuId).addClass('ThemeContainerBorderB');
      $(menuId).css('cursor', 'pointer');
    }
  }
}

function toggleMute(sender) {
  const webview = document.querySelector("webview");
  const mute = !webview.isAudioMuted();
  webview.setAudioMuted(mute);
  if (mute) {
    $('#mute_button').css('background-image', "url('img/baseline-volume_off-24px.svg')");
  } else {
    $('#mute_button').css('background-image', "url('img/baseline-volume_up-24px.svg')");
  }
}

function takeScreenshot(sender) {
  const webview = document.querySelector("webview");
  const screenScale = screen.getPrimaryDisplay().scaleFactor;
  const totalScale = screenScale;
  const rect = {x: 0, y: 0, width: width * totalScale, height: height * totalScale};
  webview.capturePage(rect, function(image) {
    ipcRenderer.send('app.screenshot', image.resize({width: width}).toPNG());
  });
}

function showShipList(sender) {
  ipcRenderer.send('app.openShipList');
}

function generalDeckMenuClicked(index) {
  for (var i = 0; i < 4; i++) {
    const $panel = $('#general_deck_' + i);
    const $menu = $('#general_deck_menu_' + i);

    if (i == index) {
      $panel.css('display', 'flex');
      $menu.removeClass('ThemeContainer');
      $menu.addClass('ThemeContainerActive');
      $menu.removeClass('ThemeContainerBorderB');
      $menu.css('cursor', 'default');
    } else {
      $panel.css('display', 'none');
      $menu.removeClass('ThemeContainerActive');
      $menu.addClass('ThemeContainer');
      $menu.addClass('ThemeContainerBorderB');
      $menu.css('cursor', 'pointer');
    }
  }
}
