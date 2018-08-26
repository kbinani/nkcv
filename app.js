'use strict';

const electron = require('electron'),
      find_free_port = require('find-free-port'),
      os = require('os'),
      fs = require('fs'),
      path = require('path'),
      strftime = require('strftime'),
      HTTPProxy = require(__dirname + '/src/HTTPProxy.js'),
      Port = require(__dirname + '/src/Port.js'),
      Master = require(__dirname + '/src/Master.js');

const {app, BrowserWindow, session, ipcMain} = require('electron');

var mainWindow = null;
var shipWindow = null;
const mandatoryApiData = ['api_start2/getData', 'api_get_member/require_info', 'api_port/port'];
var mandatoryData = {};

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {
  find_free_port(8000, function(err, port) {
    HTTPProxy.launch(port);

    const ses = session.fromPartition('persist:electron-study');
    const proxyOptions = {
      proxyRules: 'http=localhost:' + port + ',direct://',
    };
    ses.setProxy(proxyOptions, function() {
    });
  });

  const options = {
    width: 1200,
    height: 720 + 200,
    minWidth: 1200,
    minHeight: 720 + 200,
    useContentSize: true,
  };
  mainWindow = new BrowserWindow(options);
  mainWindow.loadURL('file://' + __dirname + '/main.html');

  mainWindow.webContents.on('dom-ready', function() {
    for (var key in mandatoryData) {
      const data = mandatoryData[key];
      if (data.length > 0) {
        mainWindow.webContents.send(key, data);
      }
    }
    updateScale(0.75);
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  HTTPProxy.addObserver(function(api, data) {
    if (mandatoryApiData.indexOf(api) >= 0) {
      mandatoryData[api] = data;
    }
    if (mainWindow) {
      mainWindow.webContents.send(api, data);
    }
    if (shipWindow) {
      shipWindow.webContents.send(api, data);
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

function updateScale(scale) {
  if (!mainWindow) {
    return;
  }
  const scrollBarSize = os.platform() == 'win32' ? 16 : 0;
  const width = 1200;
  const height = 720;
  mainWindow.setMinimumSize(width * scale + scrollBarSize, height * scale + scrollBarSize);
  mainWindow.webContents.executeJavaScript('updateScale(' + scale + ')');
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

  shipWindow.on('closed', function() {
    shipWindow = null;
  });
}
