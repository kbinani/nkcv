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
      Rat = require(__dirname + '/src/Rat.js');

const {app, BrowserWindow, session, ipcMain} = require('electron');

var mainWindow = null;
var shipWindow = null;
const mandatoryApiData = ['api_start2/getData', 'api_get_member/require_info', 'api_port/port'];
var mandatoryData = {};
var mainWindowClosed = false;

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  const options = {
    width: 1200,
    height: 720 + 200,
    minWidth: 1200,
    minHeight: 720 + 200,
    useContentSize: true,
  };
  mainWindow = new BrowserWindow(options);

  find_free_port(8000, function(err, port) {
    HTTPProxy.launch(port);

    const ses = session.fromPartition('persist:electron-study');
    const proxyOptions = {
      proxyRules: 'http=localhost:' + port + ',direct://',
    };
    ses.setProxy(proxyOptions, function() {
      mainWindow.loadURL('file://' + __dirname + '/main.html');
    });
  });

  mainWindow.webContents.on('dom-ready', function() {
    for (var key in mandatoryData) {
      const data = mandatoryData[key];
      if (data.length > 0) {
        mainWindow.webContents.send(key, data, '');
      }
    }
    updateScale('900/1200');
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
  if (shipWindow != null) {
    shipWindow.show();
    return;
  }
  const options = {
    useContentSize: true,
    width: 1026,
  };
  shipWindow = new BrowserWindow(options);
  shipWindow.loadURL('file://' + __dirname + '/ships.html');

  shipWindow.webContents.on('dom-ready', function() {
    for (var key in mandatoryData) {
      const data = mandatoryData[key];
      if (data.length > 0) {
        shipWindow.webContents.send(key, data);
      }
    }
  });

  shipWindow.on('close', function(event) {
    if (mainWindowClosed) {
      return;
    }
    event.preventDefault();
    shipWindow.hide();
  });
}
