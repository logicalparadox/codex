
var drip = require('drip')
  , md = require('discount')
  , fs = require('fs')
  , path = require('path')
  , async = require('async');

exports.version = '0.0.1';

exports = module.exports = Codex;

function Codex (inDir, outDir) {
  drip.call(this);
  this.inDir = inDir;
  this.outDir = outDir;
}

Codex.prototype.__proto__ = drip.prototype;

Codex.prototype.build = function () {
  var self = this
    , inDir = this.inDir
    , outDir = this.outDir;
  
  if (!inDir || !outDir) {
    this.emit('error', {
      message: 'Directory structure a mystery',
      data: {
        inDir: inDir,
        outDir: outDir
      }
    });
    return;
  }
  // ok, we can build.
  
  var dataDir = path.join(inDir, 'data');
  console.log(dataDir);
  if (true === path.existsSync(dataDir)) {
    this.getMDFiles(dataDir, function(err, results) {
      self.emit('status', {
        message: 'Found all markdown files.',
        data: results
      });
      return; // for now
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

Codex.prototype.parseMarkdown = function (markdown) {
  markdown = md.parse(markdown);
  return markdown;
};

Codex.prototype.getMDFiles = function (dir, next) {
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
            self.getMDFiles(file, function(err, res) {
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