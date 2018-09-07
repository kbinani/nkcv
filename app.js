'use strict';

const electron = require('electron'),
      find_free_port = require('find-free-port'),
      os = require('os'),
      fs = require('fs'),
      path = require('path'),
      strftime = require('strftime'),
      HTTPProxy = require(__dirname + '/src/HTTPProxy.js'),
      Port = require(__dirname + '/src/Port.js'),
      Master = require(__dirname + '/src/Master.js'),
      Rat = require(__dirname + '/src/Rat.js'),
      Dialog = require(__dirname + '/src/Dialog.js'),
      Config = require(__dirname + '/src/Config.js');

const {app, BrowserWindow, session, ipcMain, dialog} = require('electron');

var mainWindow = null;
var shipWindow = null;
const mandatoryApiData = ['api_start2/getData', 'api_get_member/require_info', 'api_port/port'];
var mandatoryData = {};
var mainWindowClosed = false;
const config = new Config({});

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  loadConfig();
  saveConfig();
  const scale = Rat.fromString(config.scale());

  const options = {
    width: 1200 * scale.value(),
    height: 720 * scale.value() + 200,
    minWidth: 1200 * scale.value(),
    minHeight: 720 * scale.value() + 200,
    useContentSize: true,
  };
  const bounds = config.mainWindowBounds();
  const scrollBarSize = os.platform() == 'win32' ? 16 : 0;
  bounds.width = Math.max(options.width, bounds.width - scrollBarSize);
  bounds.height = Math.max(options.height, bounds.height - scrollBarSize);
  Object.assign(options, bounds);
  mainWindow = new BrowserWindow(options);

  find_free_port(8000, function(err, port) {
    HTTPProxy.launch(port, function(err) {
      const ses = session.fromPartition('persist:electron-study');
      const proxyOptions = {
        proxyRules: 'http=localhost:' + port + ',direct://',
      };
      ses.setProxy(proxyOptions, function() {
        mainWindow.loadURL('file://' + __dirname + '/main.html');
      });
    });
  });

  mainWindow.webContents.on('dom-ready', function() {
    updateScale(config.scale());
    for (var key in mandatoryData) {
      const data = mandatoryData[key];
      if (data.length > 0) {
        mainWindow.webContents.send(key, data, '');
      }
    }

    if (config.shipWindowVisible()) {
      openShipList();
    }
  });

  mainWindow.on('close', function(event) {
    const bounds = mainWindow.getBounds();
    config.patch({'mainWindow.bounds': bounds}, (c) => {
      saveConfig();
    });

    const response = Dialog.confirm({
      title: '確認',
      message: '終了しますか?',
      yes: '終了',
      no: 'キャンセル'
    });
    if (!response) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', function() {
    mainWindowClosed = true;
    if (shipWindow) {
      shipWindow.close();
    }
    mainWindow = null;
  });

  HTTPProxy.addObserver(function(api, data, request_body) {
    if (mandatoryApiData.indexOf(api) >= 0) {
      mandatoryData[api] = data;
    }
    if (mainWindow) {
      mainWindow.webContents.send(api, data, request_body);
    }
    if (shipWindow) {
      shipWindow.webContents.send(api, data, request_body);
    }
  });
});

ipcMain.on('app.screenshot', function(event, data) {
  const now = new Date();
  const filename = app.getName() + '_' + strftime('%Y%m%d-%H%M%S-%L', now) + '.png';
  const fullpath = path.join(app.getPath('pictures'), filename);
  const stream = fs.createWriteStream(fullpath);
  stream.write(data);
  stream.end();
});

ipcMain.on('app.openShipList', function(event, data) {
  openShipList();
});

ipcMain.on('app.scale', function(event, scale_rat_string) {
  updateScale(scale_rat_string);
  config.patch({'scale': scale_rat_string});
  saveConfig();
});

ipcMain.on('app.patchConfig', function(event, data) {
  config.patch(data, (c) => {
    saveConfig();
  });
});

function updateScale(scale_rat_string) {
  if (!mainWindow) {
    return;
  }
  const scale_rat = Rat.fromString(scale_rat_string);
  const scale = scale_rat.value();
  const scrollBarSize = os.platform() == 'win32' ? 16 : 0;
  const width = 1200;
  const height = 720;
  const w = width * scale + scrollBarSize;
  const h = height * scale + scrollBarSize;
  const current = mainWindow.getSize();
  mainWindow.setMinimumSize(w, h);
  var next_w = current[0];
  var next_h = current[1];
  if (next_w < w) {
    next_w = w;
  }
  if (next_h < h) {
    next_h = h;
  }
  mainWindow.setSize(next_w, next_h);
  mainWindow.webContents.executeJavaScript('updateScale("' + scale_rat_string + '")');
}

function openShipList() {
  config.patch({'shipWindowVisible': true}, (c) => {
    saveConfig();
  });

  if (shipWindow != null) {
    shipWindow.show();
    return;
  }
  const options = {
    useContentSize: true,
    width: 1026,
  };
  const bounds = config.shipWindowBounds();
  Object.assign(options, bounds);
  shipWindow = new BrowserWindow(options);
  shipWindow.loadURL('file://' + __dirname + '/ships.html');

  shipWindow.webContents.on('dom-ready', function() {
    for (var key in mandatoryData) {
      const data = mandatoryData[key];
      if (data.length > 0) {
        shipWindow.webContents.send(key, data);
      }
    }
    shipWindow.webContents.send('app.shipWindowSort', config.shipWindowSort());
    shipWindow.webContents.send('app.shipWindowFilter', config.shipWindowFilter());
  });

  shipWindow.on('close', function(event) {
    const bounds = shipWindow.getBounds();
    config.patch({'shipWindow.bounds': bounds}, (c) => {
      saveConfig();
    });

    if (mainWindowClosed) {
      return;
    }
    event.preventDefault();
    shipWindow.hide();
    config.patch({'shipWindowVisible': false}, (c) => {
      saveConfig();
    });
  });
}

function loadConfig() {
  try {
    const config_path = path.join(app.getPath('userData'), 'config.json');
    const config_string = fs.readFileSync(config_path);
    const config_json = JSON.parse(config_string);
    config.patch(config_json, (c) => {
    });
  } catch (e) {
  }
}

function saveConfig() {
  try {
    const config_path = path.join(app.getPath('userData'), 'config.json');
    config.save_to(config_path);
  } catch (e) {
    console.trace(e);
  }
}
