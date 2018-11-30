window.jQuery = window.$ = require('jquery');
const {ipcRenderer, screen, clipboard, desktopCapturer, app} = require('electron');
const Port = require('./src/Port.js'),
      Master = require('./src/Master.js'),
      DataStorage = require('./src/DataStorage.js'),
      Rat = require('./src/Rat.js'),
      Dialog = require('./src/Dialog.js'),
      BattleCell = require('./src/BattleCell.js'),
      SallyArea = require('./src/SallyArea.js'),
      Notification = require('./src/Notification.js'),
      MainWindow = require('./src/renderer/main/MainWindow.js'),
      LeftPanel = require('./src/renderer/main/LeftPanel.js'),
      shared = require('./shared.js'),
      i18n = require('./src/i18n.js');
const sprintf = require('sprintf'),
      _ = require('lodash'),
      fs = require('fs'),
      tmp = require('tmp');

const width = 1200;
const height = 720;
var scale = 1;
const storage = new DataStorage();
var _port = null;
var _recording = false;
var _recorder = null;
var _left_panel = null;
var _main_window = null;

function onload() {
  require('electron-disable-file-drop');
  _main_window = new MainWindow();
  _left_panel = new LeftPanel();

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

  BattleCell.load_remote_mapping();

  storage.on('port', function(port) {
    _port = port;

    updateDeckStatus(port.decks);
    shared.updateShipStatus(port.ships);
    port.ships.forEach(function(ship) {
      const slotitems = ship.slotitems();
      const slotitem_ids = slotitems.map((it) => it.id());

      const ex_slotitem = ship.ex_slotitem();
      if (ex_slotitem) {
        slotitem_ids.push(-1);
        slotitem_ids.push(ex_slotitem.id());
        slotitems.push(ex_slotitem);
      }

      const size_normal = 30;
      const size_small = 25;
      slotitem_ids.forEach(function(it) {
        $('#deck_ship_' + ship.id() + '_slotitem').append(createDeckShipSlotitemCell(it, size_normal));
        $('#general_ship_' + ship.id() + '_slotitem').append(createDeckShipSlotitemCell(it, size_small));
      });
      shared.updateSlotitemStatus(slotitems);
    });

    $('#user_name').html(port.nickname());
    $('#user_level').html(port.level());
    $('#user_comment').html(port.comment());
    $('#user_rank').html(i18n.__(port.rank()));
    $('#user_rank').attr('data-i18n', port.rank());
  });

  storage.on('questlist', (questlist) => {
    const $container = $('#general_quest');
    $container.empty();
    const template = `
      <div class="quest_{no}" style="flex: 0 0 auto; display: flex; height: 20px; line-height: 20px;">
        <div class="quest_{no}_icon" style="flex: 0 0 auto; width: 12px; height: 12px; background-color: red; margin-top: 4px;"></div>
        <div class="quest_{no}_title EllipsisLabel" style="flex: 1 1 auto; margin-left: 5px;"></div>
      </div>`;
    const list = questlist.get().filter((quest) => {
      const state = quest.state();
      return state == 2 || state == 3;
    });

    list.forEach((quest) => {
      const html = template.replace(/{no}/g, quest.no());
      $container.append(html);
    });

    for (var i = 0; i < list.length; i++) {
      const quest = list[i];
      const $item = $('.quest_' + quest.no() + '_title');
      $item.html(quest.title());
      const title = quest.title() + '\n' + quest.detail().replace(/<br>/g, '\n');
      $item.attr('title', title);
      var color = '';
      switch (quest.category()) {
        case 1: // 編成
          color = 'rgb(51, 173, 98)';
          break;
        case 2: // 出撃
        case 8:
          color = 'rgb(202, 83, 82)';
          break;
        case 3: // 演習
          color = 'rgb(109, 177, 81)';
          break;
        case 4: // 遠征
          color = 'rgb(78, 170, 167)';
          break;
        case 5: // 補給/入渠
          color = 'rgb(205, 182, 96)';
          break;
        case 6: // 工廠
          color = 'rgb(113, 79, 66)';
          break;
        case 7: // 改装
          color = 'rgb(181, 142, 199)';
          break;
        default:
          color = ''; //TODO
          break;
      }
      $('.quest_' + quest.no() + '_icon').css('background-color', color);
    }
  });

  storage.on('kdock', (kdock) => {
    const ships = kdock.ships();
    for (var i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const $container = $('#general_kdock_' + i);
      const state = ship.state();
      if (state == -1) {
        $container.html(`<div style="height: 20px;" data-i18n="Locked">${i18n.__('Locked')}</div>`);
      } else if (state == 0) {
        $container.html(`<div style="height: 20px;" data-i18n="Unused">${i18n.__('Unused')}</div>`);
      } else {
        const template = `
          <div style="display: flex; height: 20px;">
            <div style="flex: 0 0 auto;">
              <span data-i18n="{name}">{localized_name}</span>
              <span class="{class}" style="display: none;" data-timer-finish="{complete}" data-timer-complete-message="完成" data-i18n="Complete" data-i18n-attribute="data-timer-complete-message"></span>
            </div>
            <div class="{class}" style="flex: 1 1 auto; text-align: right;" data-timer-finish="{complete}" data-i18n="Complete">{label}</div>
          </div>`;
        const complete = ship.complete_time().getTime();
        const cls = (complete <= 0) ? '' : 'CountdownLabel';
        const label = (complete <= 0) ? i18n.__('Complete') : '';
        const html = template.replace(/{name}/g, ship.name())
                             .replace(/{localized_name}/g, i18n.__(ship.name()))
                             .replace(/{complete}/g, complete)
                             .replace(/{label}/g, label)
                             .replace(/{class}/g, cls);
        $container.html(html);
      }
    }
  });

  storage.on('ndock', (ndock) => {
    const ships = ndock.ships();
    for (var i = 0; i < ships.length; i++) {
      const ndock_ship = ships[i];
      const state = ndock_ship.state();
      $title = $('.ndock_' + i + '_title');
      $countdown = $('.ndock_' + i + '_countdown');
      $notification = $('.ndock_' + i + '_notification');
      switch (state) {
        case 0: {
          $title.html(i18n.__('Unused'));
          $title.attr('data-i18n', 'Unused');
          $countdown.removeClass('CountdownLabel');
          $countdown.html('');
          $notification.removeClass('CountdownLabel');
          break;
        }
        case 1:
        case 2: {
          const now = new Date();
          const finish_time = ndock_ship.complete_time().getTime();
          const ship = ndock_ship.ship();
          $title.html(i18n.__(ship.name()));
          $title.attr('data-i18n', ship.name());
          $countdown.addClass('CountdownLabel');
          $countdown.attr('data-timer-finish', finish_time);
          $countdown.attr('data-timer-complete-message', i18n.__('Repair.Complete'));
          $countdown.attr('data-i18n', 'Complete');
          $countdown.attr('data-i18n-attribute', 'data-timer-complete-message');
          $countdown.attr('data-i18n-format', '<span data-i18n="Repair.Complete">%s</span>');
          if (finish_time > now.getTime()) {
            const key = `Repairs Complete: %s`;
            $notification.attr('data-timer-finish', finish_time);
            $notification.attr('data-i18n', key);
            $notification.attr('data-i18n-attribute', 'data-timer-complete-notification-message');
            $notification.attr('data-i18n-translated-key-as-format', i18n.__(ship.name()));
            $notification.attr('data-timer-complete-notification-message', sprintf(i18n.__(key), i18n.__(ship.name())));
            $notification.addClass('CountdownLabel');
          }
          break;
        }
      }
    }
  });

  storage.on('created_slotitem', (created_slotitem) => {
    const slotitem = created_slotitem.slotitem;
    if (slotitem == null) {
      $('#general_develop_fail').css('display', 'inline');
      $('#general_develop').html(i18n.__(created_slotitem.name()));
      $('#general_develop').attr('data-i18n', created_slotitem.name());
    } else {
      $('#general_develop_fail').css('display', 'none');
      $('#general_develop').html(i18n.__(slotitem.name()));
      $('#general_develop').attr('data-i18n', slotitem.name());
    }
  });

  storage.on('sortie', (data) => {
    BattleCell.load_remote_mapping();
    SallyArea.load_remote_mapping();
  });

  storage.on('battleresult', (result) => {
    _left_panel.set_battle_result(result);
  });

  ipcRenderer.on('app.mute', function(event, mute) {
    setMute(mute);
  });

  ipcRenderer.on('app.startScreenRecording', function(event, token) {
    startScreenRecording(token);
  });

  setInterval(function() {
    var messages = [];
    const now = new Date();
    $('.CountdownLabel').each(function() {
      const finish = $(this).attr('data-timer-finish');
      if (!finish) {
        return;
      }
      const remaining = finish - now.getTime();
      if (remaining <= 0) {
        $(this).removeClass('CountdownLabel');

        const label = $(this).attr('data-timer-complete-message');
        if (label) {
          $(this).html(label);
        } else {
          $(this).html('');
        }

        const notify_message = $(this).attr('data-timer-complete-notification-message');
        if (notify_message) {
          messages.push(notify_message);
        }

        $(this).removeAttr('data-timer-finish');
        $(this).removeAttr('data-timer-complete-message');
        $(this).removeAttr('data-timer-complete-notification-message');
      } else {
        const label = shared.timeLabel(remaining / 1000.0);
        $(this).html(label);
      }
    });
    const message = _.uniq(messages).join("\n");
    if (message != "") {
      Notification.show(message);
    }
  }, 1000);
}

function updateDeckStatus(decks) {
  for (var i = 0; i < decks.length; i++) {
    const deck = decks[i];
    const container = $('#deck_' + i + '_ships');
    container.empty();
    const general_deck_container = $('#general_deck_' + i + '_ships');
    general_deck_container.empty();
    for (var j = 0; j < deck.ships.length; j++) {
      const ship = deck.ships[j];

      const html = createDeckShipCell(ship.id(), ship.name());
      container.append(html);

      const general = createGeneralShipCell(ship.id(), ship.name());
      general_deck_container.append(general);
    }

    let name = deck.name();
    if (deck.battle_cell) {
      let cell_name = deck.battle_cell.name();
      if (cell_name.length > 0) {
        name += ' (' + cell_name + ')';
      }
    }
    const deck_title = name.length == 0 ? sprintf(i18n.__(`Nth(${i}) fleet`), i) : name;
    $('.deck_' + i + '_title').html(deck_title);

    $countdown = $('.deck_' + i + '_countdown');
    $notification = $('.deck_' + i + '_notification');

    const mission_finish_time = deck.mission_finish_time();
    var color = "";
    if (mission_finish_time) {
      color = 'blue';
      $countdown.attr('data-timer-finish', mission_finish_time.getTime());
      $countdown.attr('data-timer-complete-message', i18n.__('Returned'));
      $countdown.attr('data-i18n', 'Returned');
      $countdown.attr('data-i18n-attribute', 'data-timer-complete-message');
      $countdown.attr('data-i18n-format', '<span data-i18n="Returned">%s</span>');
      $countdown.addClass('CountdownLabel');

      const now = new Date();
      if (mission_finish_time > now.getTime()) {
        if (name.length == 0) {
          const format = `[${i}] %s`;
          const key = `Nth(${i}) expedition fleet has returned`;
          $notification.attr('data-timer-complete-notification-message', sprintf(format, i18n.__(key)));
          $notification.attr('data-i18n', key);
          $notification.attr('data-i18n-attribute', 'data-timer-complete-notification-message');
          $notification.attr('data-i18n-format', format);
          $notification.removeAttr('data-i18n-translated-key-as-format');
        } else {
          const key = 'Expedition fleet "%s" has returned';
          $notification.attr('data-timer-complete-notification-message', sprintf(i18n.__(key), name));
          $notification.attr('data-i18n', key);
          $notification.attr('data-i18n-attribute', 'data-timer-complete-notification-message');
          $notification.attr('data-i18n-translated-key-as-format', name);
        }
        $notification.attr('data-timer-finish', mission_finish_time.getTime());
        $notification.addClass('CountdownLabel');
      }
    } else {
      if (deck.battle_cell != null) {
        color = 'red';
      } else if (deck.is_ready_to_sortie()) {
        color = '#00CC00';
      } else {
        color = 'orange';
      }
      $countdown.removeClass('CountdownLabel');
      $countdown.html('');
      $notification.removeClass('CountdownLabel');
    }
    $('.deck_' + i + '_icon').css('background-color', color);
    $('.deck_' + i + '_taiku').html(deck.taiku());
    $('.deck_' + i + '_soku').html(i18n.__(`speed.${deck.soku().toString()}`));
    $('.deck_' + i + '_soku').attr('data-i18n', `speed.${deck.soku().toString()}`);
    $('.deck_' + i + '_sakuteki').html(deck.sakuteki());
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
  const response = Dialog.confirm({
    title: i18n.__('Confirmation'),
    message: i18n.__('Back to previous page?'),
    yes: i18n.__('Back'),
    no: 'Cancel'
  });
  if (response) {
    document.querySelector("webview").goBack();
  }
}

function browserReloadClicked(sender) {
  const response = Dialog.confirm({
    title: i18n.__('Confirmation'),
    message: i18n.__('Reload page?'),
    yes: i18n.__('Reload'),
    no: 'Cancel'
  });
  if (response) {
    document.querySelector("webview").reload();
  }
}

function updateScale(scale_rat_string) {
  const scale_rat = Rat.fromString(scale_rat_string);
  scale = scale_rat.value();
  applyScale();
  $('#browser_scale').val(scale_rat_string);
}

function applyScale() {
  const webview = document.querySelector("webview");
  webview.setZoomFactor(scale);
  $("#container").css("min-width", (width * scale) + "px");
  $("#webview_container").css("flex", "0 0 " + (height * scale) + "px");
  $("#wv").css("width", (width * scale) + "px");
  $("#wv").css("height", (height * scale) + "px");
  _left_panel.applyScale(scale);
}

function createDeckShipCell(ship_id, name) {
  const template = `
    <tr class="DeckShipCell ThemeContainerBorderB">
      <td class="ship_{ship_id}_type FontNormal" style="padding: 5px;" nowrap>艦種</td>
      <td class="ship_{ship_id}_name FontLarge" style="padding: 5px;" nowrap><span data-i18n="{name}">{localized_name}</span></td>
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
      <td style="padding: 5px;" nowrap>
        <div style="display: flex; flex-direction: column;">
          <div style="flex: 0 0 auto; width: 60px; height: 8px; background-color: white;">
            <div class="ship_{ship_id}_fuel_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>
          </div>
          <div style="flex: 0 0 auto; height: 5px;"></div>
          <div style="flex: 0 0 auto; width: 60px; height: 8px; background-color: white;">
            <div class="ship_{ship_id}_bull_percentage" style="width: 50%; height: 8px; background-color: blue;"></div>
          </div>
        </div>
      </td>
      <td style="padding: 5px; overflow: hidden;">
        <div id="deck_ship_{ship_id}_slotitem" style="display: flex;">
        </div>
      </td>
      <td style="padding: 5px; overflow: hidden;" width="99999"></td>
    </tr>`;
    return template.replace(/{ship_id}/g, ship_id)
                   .replace(/{name}/g, name)
                   .replace(/{localized_name}/g, i18n.__(name));
}

function createDeckShipSlotitemCell(slotitem_id, size) {
  if (slotitem_id == -1) {
    const template = '<div class="ThemeContainerBorderL" style="flex: 0 0 auto; width: 1px; height: {size}px; margin-left: 3px; margin-right: 3px;"></div>';
    return template.replace(/{size}/g, size);
  } else {
    const template = `
      <div title="12.7cm連装砲" class="slotitem_{slotitem_id}_icon" style="display: flex; flex-direction: column; flex: 0 0 auto; width: {size}px; height: {size}px; background-image: url(\'img/main_canon_light.svg\'); background-size: contain; background-repeat: no-repeat; background-position: 50%; margin-left: 1px; margin-right: 1px;">
        <div style="display: flex; flex: 1 1 auto; height: {size-1/2}px; line-height: {size-1/2}px; font-size: {size-1/2-font}px; text-align: center;">
          <div style="flex: 1 1 auto;"></div>
          <div class="slotitem_{slotitem_id}_proficiency" style="flex: 0 0 auto; padding: 2px;"></div>
        </div>
        <div class="slotitem_{slotitem_id}_level" style="flex: 1 1 auto; height: {size-1/2}px; line-height: {size-1/2}px; font-size: {size-1/2-font}px; text-align: center;">
        </div>
      </div>`;
    return template.replace(/{slotitem_id}/g, slotitem_id)
                   .replace(/{size}/g, size)
                   .replace(/{size-1\/2}/g, size * 0.5)
                   .replace(/{size-1\/2-font}/g, size * 0.5 * 0.6);
  }
}

function createGeneralShipCell(ship_id, name) {
  const template = `
    <div style="display: table-row; height: 40px;">
      <div class="ship_{ship_id}_name ThemeContainerBorderB" style="display: table-cell; vertical-align: middle; padding: 5px;"><span data-i18n="{name}">{localized_name}</span></div>
      <div class="ThemeContainerBorderB" style="display: table-cell; vertical-align: middle; padding: 5px;">
        <div class="FontNormal">Lv. <span class="ship_{ship_id}_level">1</span></div>
      </div>
      <div class="ThemeContainerBorderB" style="display: table-cell; vertical-align: middle; padding: 5px;">
        <div class="FontNormal"style="display: flex; flex-direction: column;">
          <div style="flex: 1 1 auto;">HP: <span class="ship_{ship_id}_hp_numerator">999</span> / <span class="ship_{ship_id}_hp_denominator">999</span></div>
          <div style="flex: 0 0 5px;"></div>
          <div style="flex: 1 1 auto; display: flex;">
            <div style="flex: 1 1 auto; height: 8px; width: 60px; background-color: white;">
              <div class="ship_{ship_id}_hp_percentage" style="height: 8px; width: 50%; background-color: blue;"></div></div>
          </div>
        </div>
      </div>
      <div class="ThemeContainerBorderB" style="display: table-cell; vertical-align: middle; padding: 5px;">
        <div class="FontNormal"style="display: flex; flex-direction: column;">
          <div style="flex: 1 1 auto; display: flex;">
            <div class="ship_{ship_id}_cond_icon" style="flex: 0 0 auto; width: 12px; height: 12px; background-color: white; margin: auto;"></div>
            <div class="ship_{ship_id}_cond" style="flex: 1 1 auto; margin-left: 5px;">49</div>
          </div>
          <div>cond</div>
        </div>
      </div>
      <div class="ThemeContainerBorderB" style="display: table-cell; overflow: hidden; vertical-align: middle; padding: 5px;">
        <div id="general_ship_{ship_id}_slotitem" style="display: flex;">
        </div>
      </div>
    </div>`;
  return template.replace(/{ship_id}/g, ship_id)
                 .replace(/{name}/g, name)
                 .replace(/{localized_name}/g, i18n.__(name));
}

function deckMenuClicked(index) {
  for (var i = 0; i < 4; i++) {
    const $deck_panel = $('#deck_' + i + '_ships');
    const $deck_menu = $('#deck_' + i + '_menu');

    const $general_panel = $('.general_deck_' + i);
    const $general_menu = $('#general_deck_menu_' + i);

    if (i == index) {
      $deck_panel.removeClass('DeckTable');
      $deck_panel.addClass('DeckTableActive');

      $deck_menu.removeClass('ThemeContainer');
      $deck_menu.addClass('ThemeContainerActive');
      $deck_menu.removeClass('ThemeContainerBorderB');
      $deck_menu.css('cursor', 'default');

      $general_panel.css('display', 'flex');

      $general_menu.removeClass('ThemeContainer');
      $general_menu.addClass('ThemeContainerActive');
      $general_menu.removeClass('ThemeContainerBorderB');
      $general_menu.css('cursor', 'default');
    } else {
      $deck_panel.addClass('DeckTable');
      $deck_panel.removeClass('DeckTableActive');

      $deck_menu.removeClass('ThemeContainerActive');
      $deck_menu.addClass('ThemeContainer');
      $deck_menu.addClass('ThemeContainerBorderB');
      $deck_menu.css('cursor', 'pointer');

      $general_panel.css('display', 'none');

      $general_menu.removeClass('ThemeContainerActive');
      $general_menu.addClass('ThemeContainer');
      $general_menu.addClass('ThemeContainerBorderB');
      $general_menu.css('cursor', 'pointer');
    }
  }
}

function setMute(mute) {
  const webview = document.querySelector("webview");
  webview.setAudioMuted(mute);
  if (mute) {
    $('#mute_button').css('background-image', "url('img/baseline-volume_off-24px.svg')");
  } else {
    $('#mute_button').css('background-image', "url('img/baseline-volume_up-24px.svg')");
  }
}

function toggleMute(sender) {
  const webview = document.querySelector("webview");
  const mute = !webview.isAudioMuted();
  setMute(mute);
  ipcRenderer.send('app.patchConfig', {'mute': mute});
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

function scaleSelected(sender) {
  const scale_string = $("#browser_scale").val();
  ipcRenderer.send('app.scale', scale_string);
}

function copyDeckInfo(deck_index) {
  if (!_port) {
    return;
  }
  if (deck_index < 0 || _port.decks.length <= deck_index) {
    return;
  }
  const deck = _port.decks[deck_index];
  if (!deck) {
    return;
  }
  var lines = [];
  lines.push('----');
  lines.push(`(${i18n.__('Fighter Power')}: ${deck.taiku()}, ${i18n.__('LoS')}: ${deck.sakuteki()})`);
  deck.ships.forEach((ship) => {
    var line = '';
    line += i18n.__(ship.name()) + ship.level();
    line += '{cond:' + ship.cond() + ',HP:' + ship.hp().toString() + '}';
    line += '[' + ship.slotitems().map((slotitem) => i18n.__(slotitem.name()) + slotitem.level_description()).join('/') + ']';
    const ex = ship.ex_slotitem();
    line += '[' + (ex == null ? [] : [ex]).map((slotitem) => i18n.__(slotitem.name()) + slotitem.level_description()).join('/') + ']';
    lines.push(line);
  });
  clipboard.writeText(lines.join('\n') + '\n');
}

function setRecording(v) {
  _recording = v;
  $('#record_button').css('background-image', v ? "url('img/baseline-videocam-active-24px.svg')" : "url('img/baseline-videocam-24px.svg')");
}

function toggleScreenRecording(sender) {
  if (!_recording) {
    ipcRenderer.send('app.screenRecordingToken');
  } else {
    const recorder = _recorder;
    if (!recorder) {
      return;
    }
    recorder.stop();
  }
}

function startScreenRecording(token) {
  const options = {
    types: ['window'],
  };
  desktopCapturer.getSources(options, (error, sources) => {
    if (error) {
      setRecording(false);
      return;
    }
    const source = _.find(sources, (it) => it.name.indexOf(token) >= 0);
    if (!source) {
      setRecording(false);
      return;
    }
    const media_options = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id
        }
      }
    };
    navigator.mediaDevices.getUserMedia(media_options)
      .then((stream) => {
        setRecording(true);
        ipcRenderer.send('app.screenRecordingStarted');
        _recorder = new MediaRecorder(stream);
        var stopped = false;
        const filepath = tmp.fileSync({postfix: '.webm'});
        const file = fs.createWriteStream(filepath.name);
        _recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            var reader = new FileReader();
            reader.addEventListener('loadend', (event) => {
              if (event.error) {
                _recorder.stop();
              } else {
                file.write(new Buffer(reader.result));
                if (stopped) {
                  reader.abort();
                  reader = null;
                  file.end();
                  ipcRenderer.send('app.recorded', filepath.name);
                }
              }
            });
            reader.readAsArrayBuffer(event.data);
          }
        };
        _recorder.onstop = () => {
          stopped = true;
          setRecording(false);
        };
        const timeslice_milli_sec = 1000;
        _recorder.start(timeslice_milli_sec);
      }).catch((e) => {
        setRecording(false);
      });
  });
}
