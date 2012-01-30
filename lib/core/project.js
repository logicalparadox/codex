var util = require('util')
  , fs = require('fs')
  , path = require('path')
  , join = path.join
  , _exists = path.exists || fs.exists
  , _ = require('../utils')
  , Drip = require('drip')
  , Oath = require('oath')
  , ncp = require('ncp').ncp
  , rimraf = require('rimraf')
  , jade = require('jade')
  , stylus = require('stylus')
  , marked = require('marked');

module.exports = Project;

function Project (config) {
  Drip.call(this, { wildcard: true });
  this.config = _.defaults(config || {}, {
    clean: false // remove out directory before building
  });

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
    , 'ensureOutFolders'
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
        , function (e) { spec.reject(e); } // fail, pass on error
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
    if (!exists)
      return promise.reject(new Error('Input directory does not exist.'));
    if (!config.tempalateDir)
      config.templateDir = path.join(config.inDir, 'template');
    _exists(config.templateDir, function (texist) {
      if (!texist)
        return promise.reject(new Error('Template directory does not exist.'));
      if (!config.outDir) config.outDir = path.join(config.inDir, 'out');
      if (config.clean == true) {
        // recrusively delete all files and directories
        rimraf(config.outDir, function (err) {
          if (err) return promise.reject(err);
          _.mkdir(config.outDir, promise.node());
        });
      } else {
        _.mkdir(config.outDir, promise.node());
      }
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

Project.prototype.sortGroups = function () {
  for (var g in this.groups) {
    this.groups[g].sort(function (a, b) {
      return a.weight - b.weight;
    });
  }
};
Project.prototype.getFiles = function () {
  var promise = new Oath();
  promise.resolve();
  return promise.promise;
};

Project.prototype.ensureOutFolders = function () {
  var self = this
    , promise = new Oath()
    , count = this.files.length - 1;

  function after (err) {
    --count;
    if (err) return promise.reject(err);
    count || promise.resolve();
  }

  this.files.forEach(function (file) {
    _.mkdir(path.dirname(file.outPath), 0755, after);
  });

  return promise.promise;
};

Project.prototype.renderFiles = function () {
  var self = this
    , promise = new Oath()
    , count = this.files.length - 1;
  this.sortGroups();

  function after () {
    --count || promise.resolve();
  }

  this.files.forEach(function (file) {
    var template = join(self.config.templateDir, file.template + '.jade');
    _exists(template, function (exists) {
      if (!exists) {
        self.emit('error', {
            message: 'Missing Template'
          , data: template
        });
        return after(); // not sending error cause we don't want to bail
      }

      var locals = {
          filename: template
        , file: file
        , pretty: true
        , site: self.config.locals
        , files: self.groups
      };

      fs.readFile(template, 'utf8', function (err, source) {
        if (err) {
          self.emit('error', {
              message: 'Template read error'
            , data: { template: template, error: err }
          });
          return after();
        }

        jade.render(source, locals, function (err, html) {
          if (err) {
            self.emit('error', {
                message: 'Jade render error'
              , data: { template: template, error: err }
            });
            return after();
          }

          fs.writeFile(locals.file.outPath, html, 'utf8', function (err) {
            if (err) {
              self.emit('error', {
                  message: 'Rendered file save error'
                , data: { path: locals.file.outPath, error: err }
              });
              return after();
            }
            promise.progress({
                message: 'Page rendered successfully'
              , data: { path: locals.file.outPath }
            });

            promise.resolve();
          });
        });
      });
    });
  });

  return promise.promise;
};

Project.prototype.moveAssets = function () {
  var self = this
    , promise = new Oath()
    , assetIn = join(this.config.templateDir, 'assets')
    , assetOut = join(this.config.outDir, 'public')
    , stylusIn = join(this.config.templateDir, 'stylus', 'main.styl')
    , stylusOut = join(this.config.outDir, 'public', 'css', 'main.css');

  _.mkdir(path.join(assetOut, 'css'), 0755, function (err) {
    if (err) return promise.reject(err);

    // ncp is a recursive copy tool
    ncp(assetIn, assetOut, function (err) {
      if (err) return promise.reject(err);

      promise.progress({
        message: 'Assets moved',
        data: { pathIn: assetIn, pathOut: assetOut }
      });

      // read stylus in file
      fs.readFile(stylusIn, 'utf8', function (err, src) {
        if (err) return promise.reject(err);

        // render stylus
        stylus(src)
          .set('filename', stylusIn)
          .include(require('nib').path)
          .include(require('fez').path)
          .render(function (err, css) {
            if (err) return promise.reject(err);

            // write css out file
            fs.writeFile(stylusOut, css, 'utf8', function (err) {
              if (err) return promise.reject(err);
              promise.progress({
                  message: 'Stylus rendered'
                , data: { path: stylusOut }
              });
              promise.resolve();
            });
          });
      });
    });
  });

  return promise.promise;
};
