'use strict';

const electron = require('electron'),
      find_free_port = require('find-free-port'),
      os = require('os'),
      HTTPProxy = require(__dirname + '/src/HTTPProxy.js'),
      Port = require(__dirname + '/src/Port.js'),
      Master = require(__dirname + '/src/Master.js');

const {app, BrowserWindow, session} = require('electron');

var mainWindow = null;

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
    updateScale(0.75);
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  Port.addObserver(function(port) {
    const message = {
      'master': Master.shared.data(),
      'port': port,
    };
    mainWindow.webContents.send('port', message);
  });
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
