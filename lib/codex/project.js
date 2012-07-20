var _ = require('./utils')
  , breeze = require('breeze')
  , Drip = require('drip')
  , fs = require('fsagent')
  , highlight = require('highlight.js')
  , jade = require('jade')
  , marked = require('marked')
  , ncp = require('ncp').ncp
  , path = require('path')
    , join = path.join
  , stylus = require('stylus')
  , util = require('util');

var errs = require('./errors')
  , plugins = require('./plugins');

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

Project.prototype.parseMarkdown = function (text) {
  var tokens = marked.lexer(text);

  tokens.forEach(function (token) {
    if (token.type == 'code') {
      var lang = token.lang || 'javascript';
      if (lang == 'js') lang = 'javascript';
      token.text = highlight.highlight(lang, token.text).value;
      token.escaped = true;
    }
  });

  return marked.parser(tokens);
};

Project.prototype.build = function (cb) {
  var stack = [
      assertFolders.bind(this)
    , loadConfigFile.bind(this)
    , loadPlugins.bind(this)
    , getFiles.bind(this)
    , ensureOutFolders.bind(this)
    , renderFiles.bind(this)
    , moveAssets.bind(this)
  ];

  breeze.series(stack, cb);
};

function assertFolders (cb) {
  var cfg = this.config;

  // are we cleaning out old files
  function clean (done) {
    if (!cfg.clean) return done();
    fs.rimraf(cfg.outDir, done);
  }

  // theck for indir
  fs.exists(cfg.inDir, function (exists) {
    if (!exists) return cb(errs.create('no exist', { dir: cfg.inDir }));

    // set our template paths
    if (!cfg.templateDir) cfg.templateDir = join(cfg.inDir, 'template');
    if (!cfg.dataDir) cfg.dataDir = join(cfg.inDir, 'data');
    if (!cfg.outDir) cfg.outDir = join(cfg.inDir, 'out');

    // check for template dir
    fs.exists(cfg.templateDir, function (texist) {
      if (!texist) return cb(errs.create('no exist', { dir: cfg.templateDir }));
      clean(function (err) {
        if (err) return cb(err);
        fs.mkdirp(cfg.outDir, cb);
      });
    });
  });
};

function loadConfigFile (cb) {
  var self = this
    , cfg = this.config
    , cfgFile = join(cfg.dataDir, 'codex.json');

  // check for conf file
  fs.exists(cfgFile, function (exist) {
    if (!exist) return cb();

    // read conf file
    fs.readFile(cfgFile, 'utf8', function (err, str) {
      if (err) return cb(err);

      // parse as json
      try { var conf = JSON.parse(str); }
      catch (ex) { return cb(ex); }

      // convert description from markdown
      if (conf.locals.description) {
        var desc = conf.locals.description;
        conf.locals.description = self.parseMarkdown(desc);
      }

      // set project config with new vals
      self.config = _.merge(cfg, conf);
      cb(null);
    });
  });
};

function loadPlugins (next) {
  var self = this
    , cfg = this.config
    , stack = [];

  // pages config
  var config = {
      name: 'pages'
    , templates: cfg.templateDir
    , pages: cfg.dataDir
  };

  // push our pages plugin in
  stack.push(config);

  if (Array.isArray(cfg.plugins)) {
    // TODO: loop and test for plugin existence?
    stack = stack.concat(cfg.plugins);
  }

  breeze.forEachSeries(stack, function (plugin, cb) {
    // try to load plugin
    if (plugins[plugin.name]) {
      var mw = plugins[plugin.name];
    } else {
      try { var mw = require(plugin.name); }
      catch (ex) {
        return cb(errs.create('no plugin', { name: plugin.name }));
      }
    }

    // run the middleware
    mw(self, plugin, function (err) {
      if (err) return cb(err);
      cb();
    });
  }, next);
};

function sortGroups () {
  for (var g in this.groups) {
    this.groups[g].sort(function (a, b) {
      return a.weight - b.weight;
    });
  }
};

function getFiles (cb) {
  cb();
};

function ensureOutFolders (cb) {
  breeze.forEachSeries(this.files, function (file, next) {
    var dir = path.dirname(file.outPath);
    fs.mkdirp(dir, next);
  }, cb);
};

function renderFiles (cb) {
  var self = this
    , cfg = this.config;

  sortGroups.call(this);

  breeze.forEach(this.files, function (file, done) {
    if (file['render-file'] === false) return done();

    // setup series params
    var template = join(cfg.templateDir, file.template + '.jade')
      , source = ''
      , html = '';

    // template locals
    var locals = {
        filename: template
      , file: file
      , pretty: true
      , site: cfg.locals
      , files: self.groups
    };

    breeze.series({
        // read the template input
        source: function (next) {
          fs.readFile(template, 'utf8', function (err, res) {
            if (err) return next(err);
            source = res;
            next(null, res);
          });
        }

        // render the template output
      , html: function (next) {
          jade.render(source, locals, function (err, res) {
            if (err) return next(err);
            html = res;
            next(null, res);
          });
        }

        // save the output
      , save: function (next) {
          fs.writeFile(locals.file.outPath, html, 'utf8', next);
        }
    }, done);
  }, cb);
};

function moveAssets (cb) {
  var self = this
    , assetIn = join(this.config.templateDir, 'assets')
    , assetOut = join(this.config.outDir, 'public')
    , stylusIn = join(this.config.templateDir, 'stylus', 'main.styl')
    , stylusOut = join(this.config.outDir, 'public', 'css', 'main.css');

  fs.mkdirp(path.join(assetOut, 'css'), function (err) {
    if (err) return cb(err);

    // ncp is a recursive copy tool
    ncp(assetIn, assetOut, function (err) {
      if (err) return cb(err);

      // read stylus in file
      fs.readFile(stylusIn, 'utf8', function (err, src) {
        if (err) return cb(err);

        // render stylus
        stylus(src)
          .set('filename', stylusIn)
          .include(require('nib').path)
          .include(require('fez').path)
          .render(function (err, css) {
            if (err) return cb(err);
            fs.writeFile(stylusOut, css, 'utf8', cb);
          });
      });
    });
  });
};

Project.prototype.flush = function () {
  this.groups = {};
  this.files = [];
};

Project.prototype.LANGUAGES = highlight.LANGUAGES;
