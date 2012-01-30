var path = require('path')
  , fs = require('fs')
  , exports = module.exports = {};

exports.isPathAbsolute = function (_path) {
  var abs = false;
  if ('/' == _path[0]) abs = true;
  if (':' == _path[1] && '\\' == _path[2]) abs = true;
  return abs;
};

// node > 0.7.x compat
exports.exists = fs.exists || path.exists;
exports.existsSync = fs.existsSync || path.existsSync;

exports.mkdir = function (_path, mode, callback) {
  if ('function' === typeof mode) {
    callback = mode;
    mode = 0755;
  }

  callback = callback || function () {};
  _path = path.resolve(_path);

  function _mkdir(p, next) {
    var _p = path.normalize(p).split('/');

    path.exists(p, function (exists) {
      if (!exists) {
        _mkdir(_p.slice(0, -1).join('/'), function (err) {
          if (err) next(err);
          fs.mkdir(p, mode, function () {
            next(null);
          });
        });
      } else {
        next(null);
      }
    });
  }

  _mkdir(_path, function(err) {
    if (err) callback(err);
    callback(null);
  });
};

var ignore = [ 'node_modules', '.git' ];
function ignored (file) {
  return !~ignore.indexOf(file);
}

exports.files = function (dir, arr) {
  arr = arr || [];
  fs.readdirSync(dir)
    .filter(ignored)
    .forEach(function (p) {
      p = path.join(dir, p);
      if (fs.statSync(p).isDirectory()){
        exports.files(p, arr);
      } else {
        arr.push(p);
      }
    });
  return arr;
};

exports.watch = function (files, fn) {
  var options = { intervale: 100 };
  files.forEach(function (file) {
    fs.watchFile(file, options, function (c, p) {
      if (p.mtime < c.mtime) fn(file);
    });
  });
};
