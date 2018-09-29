'use strict;'

const http = require('http'),
      url = require('url'),
      net = require('net'),
      zlib = require('zlib'),
      is_dev = require('electron-is-dev'),
      mkdirp = require('mkdirp'),
      path = require('path'),
      fs = require('fs'),
      _ = require('lodash');

function HTTPProxy() {

}

const observers = {};
var maxObserverId = -1;

HTTPProxy.addObserver = function(callback) {
  maxObserverId++;
  observers[maxObserverId] = callback;
  return maxObserverId;
};

HTTPProxy.removeObserver = function(key) {
  observers[key] = null;
};

function handle(api, data, request_body) {
  for (var key in observers) {
    observers[key](api, data, request_body);
  }
  if (is_dev) {
    console.log(api);
    const json = JSON.parse(data);
    const log = {
      'api': api,
      'request': request_body,
      'response': json,
    };
    const file = path.join(path.dirname(__dirname), 'api_log', api + '.json');
    mkdirp(path.dirname(file), (err) => {
      if (err) {
        console.trace(err)
        return;
      }
      const stream = fs.createWriteStream(file);
      stream.write(JSON.stringify(log, null, 2));
      stream.end();
    });
    if (api == 'api_req_map/start' || api == 'api_req_map/next') {
      const area = _.get(json, ['api_data', 'api_maparea_id'], -1);
      const map = _.get(json, ['api_data', 'api_mapinfo_no'], -1);
      const no = _.get(json, ['api_data', 'api_no'], -1);
      console.log([area, map, no].join("-"));
    }
  }
}

HTTPProxy.launch = function(port, complete) {
  var server = http.createServer(function onCliReq(cliReq, cliRes) {
    var cliSoc = cliReq.socket || cliReq.connection;
    const remoteAddress = cliReq.connection.remoteAddress;

    const whitelist = ['::1', '::ffff:127.0.0.1'];
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

    var request_body = null;

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
                handle(api, json, request_body);
              });
            } else {
              var json = data.toString();
              if (json.indexOf("svdata=") === 0) {
                json = json.substring("svdata=".length);
              }
              handle(api, json, request_body);
            }
          } catch (e) {
            console.trace(e);
          }
        });
      }
    });
    cliReq.on('data', (data) => {
      if (request_body == null) {
        request_body = data;
      } else {
        request_body += data;
      }
      svrReq.write(data);
    });
    cliReq.on('end', () => {
      if (request_body == null) {
        request_body = '';
      } else {
        request_body = '' + request_body;
      }
      svrReq.end();
    });
    svrReq.on('error', function onSvrReqErr(err) {
      cliRes.writeHead(400, err.message, {'content-type': 'text/html'});
      cliRes.end('<h1>' + err.message + '<br/>' + cliReq.url + '</h1>');
    });
    svrReq.on('data', function(chunk) {
      console.log(chunk.toString());
    });
  }).listen(port, (e) => {
    complete(e);
  });

  server.on('clientError', function onCliErr(err, cliSoc) {
    cliSoc.end();
  });
};

module.exports = HTTPProxy;
