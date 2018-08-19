'use strict;'

const http = require('http'),
      url = require('url'),
      net = require('net'),
      zlib = require('zlib');

function HTTPProxy() {

}

const _ = HTTPProxy;

const handlers = {};

_.on = function(event, handler) {
  if (event in handlers) {
    handlers[event].push(handler);
  } else {
    handlers[event] = [handler];
  }
};

_.launch = function(port) {
  var server = http.createServer(function onCliReq(cliReq, cliRes) {
    var cliSoc = cliReq.socket || cliReq.connection;
    const remoteAddress = cliReq.connection.remoteAddress;

    const whitelist = ['::1'];
    if (whitelist.indexOf(remoteAddress) < 0) {
      cliReq.destroy();
      return;
    }

    var x = url.parse(cliReq.url);
    var options = {
      host: x.hostname,
      port: x.port || 80,
      path: x.path,
      method: cliReq.method,
      headers: cliReq.headers,
      agent: cliSoc.$agent
    };

    const kcsapiIndex = cliReq.url.indexOf("/kcsapi/");

    var self = this;
    var svrReq = http.request(options, function onSvrRes(svrRes) {
      cliRes.writeHead(svrRes.statusCode, svrRes.headers);
      svrRes.pipe(cliRes);
      if (kcsapiIndex >= 0) {
        var api = cliReq.url.substring(kcsapiIndex + "/kcsapi/".length);
        var isGzip = false;
        for (var header in svrRes.headers) {
          if (header.toLowerCase() === "content-encoding" && svrRes.headers[header].toLowerCase() === "gzip") {
            isGzip = true;
            break;
          }
        }
        var data = null;
        svrRes.on('data', function(chunk) {
          if (data == null) {
            data = chunk;
          } else {
            data = Buffer.concat([data, chunk]);
          }
        });
        svrRes.on('end', function() {
          try {
            if (isGzip) {
              zlib.gunzip(data, function(error, result) {
                if (error) {
                  console.log("error=" + error);
                }
                var json = result.toString();
                if (json.indexOf("svdata=") === 0) {
                  json = json.substring("svdata=".length);
                }
                if (api in handlers) {
                  const callbacks = handlers[api];
                  for (var i = 0; i < callbacks.length; i++) {
                    callbacks[i](json);
                  }
                }
              });
            } else {
              var json = data.toString();
              if (json.indexOf("svdata=") === 0) {
                json = json.substring("svdata=".length);
              }
              if (api in handlers) {
                const callbacks = handlers[api];
                for (var i = 0; i < callbacks.length; i++) {
                  callbacks[i](json);
                }
              }
            }
          } catch (e) {
            console.trace(e);
          }
        });
      }
    });
    cliReq.pipe(svrReq);
    svrReq.on('error', function onSvrReqErr(err) {
      cliRes.writeHead(400, err.message, {'content-type': 'text/html'});
      cliRes.end('<h1>' + err.message + '<br/>' + cliReq.url + '</h1>');
    });
    svrReq.on('data', function(chunk) {
      console.log(chunk.toString());
    });
  }).listen(port);

  server.on('clientError', function onCliErr(err, cliSoc) {
    cliSoc.end();
  });
};

module.exports = _;
