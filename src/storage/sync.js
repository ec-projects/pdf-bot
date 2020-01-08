var debug = require('debug')('pdf:sync');
var fetch = require('node-fetch');
var fs = require('fs');

function createSyncStorage(options = {}) {

  if (! options.targetUrl) {
    throw new Error('SyncBack: no URL provided')
  }

  return function syncBack(localPath, job) {
    return new Promise((resolve, reject) => {

      if ('noSync' in job.meta) {
        resolve({path: {file: null}});
        return;
      }

      var pathSplit = localPath.split('/');
      var fileName = pathSplit[pathSplit.length - 1];

      debug('Syncing back job ID %s to: %s (%s)', job.id, options.targetUrl, fileName);

      const formData = new FormData();
      formData.append('file', fs.createReadStream(localPath));

      reqOptions = options.requestOptions ? options.requestOptions : {};
      reqOptions['method'] = 'POST';
      reqOptions['body'] = formData;

      fetch(options.targetUrl, reqOptions)
        .then(res => resolve({path: {file: fileName}}))
        .catch(err => reject(err));
    })
  }
}

module.exports = createSyncStorage;
