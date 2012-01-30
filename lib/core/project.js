var util = require('util')
  , fs = require('fs')
  , path = require('path')
  , join = path.join
  , _exists = path.exists || fs.exists
  , _ = require('../utils')
  , Drip = require('drip')
  , Oath = require('oath')
  , marked = require('marked');

module.exports = Project;

function Project (config) {
  Drip.call(this, { wildcard: true });
  this.config = config || {};

  this.groups = {};
  this.files = [];

  var self = this;
  this.on([ 'register', 'file' ], function (file) {
    file.project = self.config.locals;
    self.files.push(file);
  });

  this.on([ 'register', 'group' ], function (group, specs) {
    var _group = self.groups[group] || (self.groups[group] = []);
    _group.push(specs);
  });
}

util.inherits(Project, Drip);

Project.prototype.parseMarkdown = function (md) {
  return marked(md);
};

Project.prototype.build = function (cb) {
  cb = cb || function () {};
  var spec = this._build()
    , self = this;
  spec.then(
      function () { self.emit('done'); }
    , function (e) { self.emit('error', e); }
    , function (p) { self.emit('progress', p); }
  ).node(cb);
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
      command.then(
          iterate // success
        , spec.reject // fail, pass on error
        , function (res) { spec.progress(res); }  // proxy progress event
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

  _exists(config.inDir, function (exists) {
    if (!exists) return promise.reject(new Error('Input directory does not exist.'));
    if (!config.outDir) config.outDir = path.join(config.inDir, 'out');
    _.mkdir(config.outDir, promise.node());
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
        spec.then(
            success
          , fail
          , function (res) { promise.progress(res); }
        );
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
