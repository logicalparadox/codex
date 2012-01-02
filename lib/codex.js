
var drip = require('drip')
  , utils = require('./utils')
  , md = require( "markdown" ).markdown.toHTML
  , fs = require('fs')
  , ncp = require('ncp').ncp
  , path = require('path')
  , async = require('async')
  , jade = require('jade')
  , stylus = require('stylus')
  , yaml = require('yaml')
  , dox = require('dox');

var eyes = require('eyes');

var exports = module.exports = Codex;

exports.version = '0.0.6';

ncp.limit = 16;

function Codex (inDir, outDir) {
  drip.call(this);
  this.inDir = inDir;
  this.outDir = outDir;
  this.files = [];
  this.code = [];
  this.locals = {
    files: {},
    site: {}
  };
}

Codex.prototype.__proto__ = drip.prototype;

Codex.parseMarkdown = function (markdown) {
  var res = md(markdown);
  return res;
};

Codex.prototype.build = function () {
  var self = this
    , inDir = this.inDir
    , outDir = this.outDir;

  utils.mkdir(outDir, 0755, function (err) {
    if (err) throw err;
    if (!path.existsSync(inDir) || !path.existsSync(outDir)) {
      this.emit('error', {
        message: 'Directory structure a mystery',
        data: {
          inDir: inDir,
          outDir: outDir
        }
      });
      return;
    }
    self._handleData();
  });
};

Codex.prototype._parseConfig = function () {
  // TODO: Move here
};

Codex.prototype._handleData = function () {
  var self = this
    , inDir = this.inDir
    , outDir = this.outDir
    , dataDir = this.dataDir = path.join(inDir, 'data');

  if (path.existsSync(dataDir)) {
    var cfgPath = path.join(dataDir, 'codex.json');

    if (path.existsSync(cfgPath)) {
      var cfg = JSON.parse(fs.readFileSync(cfgPath));

      if (cfg.locals) {
        if (cfg.locals.description)
          cfg.locals.description = Codex.parseMarkdown(cfg.locals.description)
        this.locals.site = cfg.locals;
      }

      if (cfg.code) {
        for (var name in cfg.code) {
          var spec = cfg.code[name]
            , file = path.resolve(dataDir, spec.file)
            , comments = dox.parseComments(fs.readFileSync(file, 'utf8'))
            , outPath = outDir + '/code/' + name + '.html'
            , href = path.dirname(outPath).replace(outDir, '') + '/' + name + '.html'

          var result = {
            title: spec.title,
            description: spec.description,
            link: spec.github,
            template: 'code',
            outPath: outPath,
            href: href,
            prepared: comments
          };

          this.code.push(result);
          if (!self.locals.files['code']) self.locals.files['code'] = [];
          self.locals.files['code'].push(result);
        }
      }
    }

    this._getMDFiles(dataDir, function(err, results) {
      if (err) throw err;

      var fileNames = [];

      results.forEach(function (res) {
        var filename = path.basename(res).replace(path.extname(res), '');

        if (filename != 'index')
          filename = filename + '/index';

        var outPath = (path.dirname(res) + '/' + filename + '.html').replace(dataDir, outDir)
          , href = path.dirname(outPath).replace(self.outDir, '') + '/'
          , shortName = res.replace(self.inDir, '');

        fileNames.push(shortName);

        var template = outPath.replace(self.outDir, '').split('/')[1].split('.')[0]
          , group = (shortName.split('/').length == 3) ? 'root' : template
          , markdown = fs.readFileSync(res, 'utf8')
          , yml = markdown.match(/^-{3}((.|\n)*)-{3}/g)
          , defaults = {
              title: '',
              template: template,
              'render-file': true
            }

        if (yml) {
          var props = yaml.eval(yml[0]);
          markdown = markdown.replace(/^-{3}((.|\n)*)-{3}/g, '');
          defaults = utils.defaults(props, defaults);
        }

        var result = {
          inPath: res,
          inFile: shortName,
          outPath: outPath,
          href: href,
          prepared: Codex.parseMarkdown(markdown)
        };

        result = utils.merge(defaults, result);

        if (result['render-file']) {
          self.files.push(result);
        }

        if (!self.locals.files[group]) self.locals.files[group] = [];
        self.locals.files[group].push(result);
      });

      self.emit('status', {
        message: 'Found all markdown files.',
        array: fileNames
      });

      self._renderFiles();
      self._prepareAssets();
    });
  } else {
    this.emit('error', {
      message: 'Data directory expected at location:',
      data: {
        dataDir: dataDir
      }
    });
    return;
  }
};

Codex.prototype._getMDFiles = function (dir, next) {
  var results = []
    , self = this;

  fs.readdir(dir, function(err, list) {
    if (err) return next(err);

    var pending = list.length;
    if (!pending) next(null, []);

    list.forEach(function(file) {
      file = dir + '/' + file;

      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          self._getMDFiles(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) next(null, results);
          });
        } else {
          var ext = path.extname(file).toLowerCase();

          if (ext == '.md' || ext == '.markdown') {
            results.push(file);
          }

          if (!--pending) next(null, results);
        }
      });
    });
  });
};

Codex.prototype._renderFiles = function () {
  var self = this
    , locals = {};

  for (var g in this.locals.files) {
    var group = this.locals.files[g];
    group.sort(function (a, b) {
      return a.weight - b.weight;
    });
  }

  this.files.forEach(function (file) {
    var template = path.join(self.inDir, 'template', file.template + '.jade');

    if (!path.existsSync(template)) {
      self.emit('error', {
        message: 'Missing template',
        data: template
      });
      return;
    }

    locals = {
      filename: template,
      file: file,
      site: self.locals.site,
      files: self.locals.files,
      pretty: true
    };

    self._renderJade(locals);
  });

  if (this.code.length > 0) {
    this.code.forEach(function (code) {
      var template = path.join(self.inDir, 'template', 'code.jade');

      if (!path.existsSync(template)) {
        self.emit('error', {
          message: 'Missing template',
          data: template
        });
        return;
      }

      locals = {
        filename: template,
        file: code,
        site: self.locals.site,
        files: self.locals.files,
        pretty: true
      };

      self._renderJade(locals);
    });
  }
};

Codex.prototype._renderJade = function (locals) {
  var self = this;

  var source = fs.readFileSync(locals.filename, 'utf8');
  jade.render(source, locals, function (err, html) {
    if (err) throw err;

    utils.mkdir(path.dirname(locals.file.outPath), 0755, function (err) {
      if (err) throw err;

      fs.writeFile(locals.file.outPath, html, 'utf8', function (err) {
        if (err) throw err;

        self.emit('status', {
          message: 'File rendered',
          target: locals.file.outPath.replace(self.outDir, '')
        });

      });

    });

  });
};

Codex.prototype._prepareAssets = function () {
  var self = this
    , assetIn = path.join(this.inDir, 'template', 'assets')
    , assetOut = path.join(this.outDir, 'public')
    , stylusIn = path.join(this.inDir, 'template', 'stylus', 'main.styl')
    , stylusOut = path.join(this.outDir, 'public', 'css', 'main.css');

  utils.mkdir(path.join(assetOut, 'css'), 0755, function (err) {
    if (err) throw err;

    ncp(assetIn, assetOut, function (err) {
      if (err) throw err;

      self.emit('status', {
        message: 'Assets moved',
        target: assetOut.replace(self.outDir, '')
      });

      var src = fs.readFileSync(stylusIn, 'utf8');

      stylus(src)
        .set('filename', stylusIn)
        .include(require('nib').path)
        .include(require('fez').path)
        .render(function (err, css) {
          if (err) throw (err);

          fs.writeFile(stylusOut, css, 'utf8', function (err) {
            if (err) throw err;

            self.emit('status', {
              message: 'Stylus rendered',
              target: stylusOut.replace(self.outDir, '')
            });
          });
        });
    });
  });
};
