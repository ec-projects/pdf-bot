// these need to occur after dotenv
var express = require('express');
var bodyParser = require('body-parser');
var debug = require('debug')('pdf:api');
var error = require('./error');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');


function createApi(createQueue, options = {}) {
  var api = express()
  api.use(bodyParser.json())

  var token = options.token

  if (!token) {
    debug('Warning: The server should be protected using a token.')
  }

  api.post('/', function(req, res) {
    var queue = createQueue()
    var authHeader = req.get('Authorization')

    if (token && (!authHeader || authHeader.replace(/Bearer (.*)$/i, '$1') !== token)) {
      res.status(401).json(error.createErrorResponse(error.ERROR_INVALID_TOKEN))
      return
    }

    queue
      .addToQueue({
        url: req.body.url,
        meta: req.body.meta || {}
      }).then(function (response) {
        queue.close()

        if (error.isError(response)) {
          res.status(422).json(response)
          return
        }

        if (options.postPushCommand && options.postPushCommand.length > 0) {
          childProcess.spawn.apply(null, options.postPushCommand)
        }

        res.status(201).json(response)
      })
  });

  /*
      Synchronous document generation
   */
  api.post('/sync', function(req, res) {

    var queue = createQueue();
    var authHeader = req.get('Authorization');

    if (token && (!authHeader || authHeader.replace(/Bearer (.*)$/i, '$1') !== token)) {
      res.status(401).json(error.createErrorResponse(error.ERROR_INVALID_TOKEN));
      return;
    }

    if (! ('meta' in req.body)) {
      req.body.meta = {};
    }
    req.body.meta.noSync = true;

    queue
      .addToQueue({url: req.body.url, meta: req.body.meta || {}})
      .then(function (response) {
        queue.close();

        if (error.isError(response)) {
          res.status(422).json(response);
          return;
        }

        var filePath = path.join(options.storagePath, 'pdf', response.id + '.pdf');

        debug('Processing job:' + response.id);
        debug('Target file:', filePath);

        var cmd = 'pdf-bot -c config.js generate ' + response.id;
        childProcess.execSync(cmd, {timeout: 10000});

        if (fs.existsSync(filePath)) {
          var file = fs.readFileSync(filePath);
          response.file = (new Buffer(file)).toString('base64');
          res.status(201).json(response);
          return;
        }

        debug('File does not exist: ', filePath);
        res.status(500).json({});
      })

  });

  return api
}

module.exports = createApi
