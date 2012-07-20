var exports = module.exports = require('dragonfly')('CodexError');

exports.register('no exist', {
    message: 'Expected file/directory does not exist.'
  , code: 'ENOENT'
});

exports.register('no plugin', {
    message: 'Unable to load plugin.'
  , code: 'ENOPLUGIN'
});
