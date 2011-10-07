
var drip = require('drip')
  , md = require('discount')
  , fs = require('fs')
  , mkdir = require('mkdirp')
  , ncp = require('ncp').ncp
  , path = require('path')
  , async = require('async')
  , jade = require('jade')
  , stylus = require('stylus');

exports.version = '0.0.1';

exports = module.exports = Codex;

ncp.limit = 16;

function Codex (inDir, outDir) {
  drip.call(this);
  this.inDir = inDir;
  this.outDir = outDir;
  this.files = [];
  this.locals = {
    files: {}
  };
}

Codex.prototype.__proto__ = drip.prototype;

Codex.parseMarkdown = function (markdown) {
  markdown = md.parse(markdown);
  return markdown;
};

Codex.prototype.build = function () {
  var self = this
    , inDir = this.inDir
    , outDir = this.outDir;
  
  mkdir(outDir, 0755, function (err) {
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

Codex.prototype._handleData = function () {
  var self = this
    , inDir = this.inDir
    , outDir = this.outDir;
  
  var dataDir = this.dataDir = path.join(inDir, 'data');
  
  if (path.existsSync(this.dataDir)) {
    this._getMDFiles(dataDir, function(err, results) {
      var files = [], result, fileNames = [];
      
      results.forEach(function (res) {
        var outPath = (path.dirname(res) + '/' + 
                      path.basename(res).replace(path.extname(res), '.html'))
                        .replace(dataDir, outDir)
          , href = outPath.replace(self.outDir, '')
          , shortName = res.replace(self.inDir, '');
        
        fileNames.push(shortName);
        
        var template = href.split('/')[1];
        template = template.split('.')[0];
        
        var markdown = fs.readFileSync(res, 'utf8');
        var prepared = Codex.parseMarkdown(markdown);
        
        result = {
          inPath: res,
          inFile: shortName,
          outPath: outPath,
          href: href,
          template: template,
          prepared: prepared
        };
        
        self.files.push(result);
        self.locals.files[template] = self.files[template] || [];
        self.locals.files[template].push(result);
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
    
    list.forEach(function(file) {
      file = dir + '/' + file;
      
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          if (path.basename(file).toLowerCase() != 'assets') {
            self._getMDFiles(file, function(err, res) {
              results = results.concat(res);
              if (!--pending) next(null, results);
            });
          } else {
            if (!--pending) next(null, results);
          }
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
      files: self.locals.files,
      pretty: true
    };
    
    self._renderJade(locals);
  });
};

Codex.prototype._renderJade = function (locals) {
  var self = this;
  
  var source = fs.readFileSync(locals.filename, 'utf8');
  jade.render(source, locals, function (err, html) {
    if (err) throw err;
    mkdir(path.dirname(locals.file.outPath), 0755, function (err) {
      if (err) throw err;
      
      fs.writeFile(locals.file.outPath, html, 'utf8', function (err) {
        if (err) throw err;
        
        self.emit('status', {
          message: 'File rendered',
          target: locals.file.href
        });
        
      });
      
    });
    
  });
};

Codex.prototype._prepareAssets = function () {
  var self = this
    , assetIn = path.join(this.inDir, 'template', 'assets')
    , assetOut = path.join(this.outDir, 'public', 'css')
    , stylusIn = path.join(this.inDir, 'template', 'stylus', 'main.styl')
    , stylusOut = path.join(this.outDir, 'public', 'css', 'main.css');
  
  mkdir(assetOut, 0755, function (err) {
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
        .render(function (err, css) {
          if (err) throw (err);
          
          fs.writeFile(stylusOut, css, 'utf8', function (err) {
            self.emit('status', {
              message: 'Stylus rendered',
              target: stylusOut.replace(self.outDir, '')
            });
            console.log(self.files);
            console.log(self.locals.files);
          });
        });
      
    });
  });
};













