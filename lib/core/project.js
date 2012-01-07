var util = require('util')
  , fs = require('fs')
  , path = require('path')
  , _ = require('../utils')
  , Drip = require('drip')
  , Oath = require('oath')
  , marked = require('marked');

module.exports = Project;

function Project (config) {
  Drip.call(this, { wildcard: true });
  this.config = config || {};

  this.locals = config.locals || {};
  this.groups = {};
  this.files = [];

  var self = this;
  this.on([ 'register', 'file' ], function (file) {
    file.locals = self.locals;
    self.files.push(file);
  });

  this.on([ 'register', 'group' ], function (group, specs) {
    if (!self.groups[group]) self.groups[group] = [];
    self.groups[group].push(specs);
  });
}

util.inherits(Project, Drip);

Project.prototype.parseMarkdown = function (md) {
  return marked(md);
};

Project.prototype.build = function (cb) {
  var self = this;

  function fail (err) {
    self.emit('error', err);
    if ('function' === typeof cb) cb(err);
  }

  function success () {
    self.emit('done');
    if ('function' === typeof cb) cb(null);
  }

  function progress (res) {
    self.emit('progress', res);
  }

  var spec = this._build();
  spec.onprogress(progress);
  spec.then(success, fail);
};

Project.prototype._build = function () {
  var self = this
    , spec = new Oath();

  var stack = [
      'assertFolders'
    , 'loadMiddleware'
    , 'getFiles'
    , 'renderFiles'
    , 'moveAssets'
  ];

  function iterate () {
    var cmd = stack.shift();
    if (!cmd) {
      spec.resolve();
    } else {
      var command = self[cmd]();
      command.onprogress(
        function (res) { spec.progress(res); }
      );
      command.then(
          iterate
        , function (err) { spec.reject(err); }
      );
    }
  }

  process.nextTick(function () {
    iterate();
  });

  return spec.promise;
};

Project.prototype.assertFolders = function () {
  var promise = new Oath()
    , config = this.config;

  path.exists(config.inDir, function (exists) {
    if (!exists) return promise.reject(new Error('Input directory does not exist.'));
    if (!config.outDir) config.outDir = path.join(config.inDir, 'out');
    _.mkdir(config.outDir, function (err) {
      if (err) return promise.reject(err);
      promise.resolve();
    });
  });

  return promise.promise;
};

Project.prototype.loadMiddleware = function () {
  var self = this
    , promise = new Oath()
    , stack = [];

  var config = {
      name: 'pages'
    , templates: path.join(this.config.inDir, 'template')
    , pages: path.join(this.config.inDir, 'data')
  };

  stack.push(config);
  if (this.config.middleware)
    stack.concat(this.config.middleware);

  function success (res) {
    self.emit([ 'middleware', 'loaded', res.name ], res);
    promise.progress(res);
    iterate();
  }

  function fail (res) {
    self.emit([ 'middleware', 'failed', res.name ], res);
    promise.reject(res);
  }

  function iterate () {
    var middleware = stack.shift();
    if (!middleware) {
      promise.resolve();
    } else {
      var mw, err;
      try {
        mw = require('../middleware/' + middleware.name);
      } catch (incErr) {
        err = incErr;
        try {
          mw = require(middleware.name);
        } catch (reqErr) {
          err = reqErr;
        }
      }

      if (!mw || 'function' !== typeof mw) {
        fail({
            name: middleware.name
          , err: err || new Error('Unable to load middleware')
        });
        return;
      } else {
        var spec = mw(self, middleware);
        spec.onprogress(function (res) {
          promise.progress(res);
        });
        spec.then(success, fail);
      }
    }
  }

  process.nextTick(function () {
    iterate();
  });

  return promise.promise;
};

Project.prototype.getFiles = function () {
  var promise = new Oath();
  promise.resolve();
  return promise.promise;
};

Project.prototype.renderFiles = function () {
  var promise = new Oath();
  promise.resolve();
  return promise.promise;
};

Project.prototype.moveAssets = function () {
  var promise = new Oath();
  promise.resolve();
  return promise.promise;
};