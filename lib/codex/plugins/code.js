var _ = require('../utils');
  , breeze = require('breeze')
  , dox = require('dox')
  , fs = require('fsagent')
  , path = require('path')
    , join = path.join

module.exports = function (project, config, cb) {
  var files = config.files
    , dataDir = project.config.dataDir
    , outDir = project.config.outDir;

  doSeries(files, function (file, index, next) {
    var filename = path.resolve(dataDir, file.file);

    fs.exists(filename, function (exist) {
      if (!exist) return next();

      var comments = dox.parseComments(fs.readFileSync(filename, 'utf8'), { raw: true })
        , name = file.name
        , outPath = join(outDir, 'code', name + '.html')
        , href = path.dirname(outPath).replace(outDir, '') + '/' + name + '.html'
        , defaults = {
              title: ''
            , template: 'code'
            , 'render-file': true
          }

      comments.forEach(function (comment) {
        if (comment.description) {
          comment.description.full = project.parseMarkdown(comment.description.full);
          comment.description.summary = project.parseMarkdown(comment.description.summary);
          comment.description.body = project.parseMarkdown(comment.description.body);
        }
      });

      defaults = _.defaults(file, defaults);

      var result = {
          title: file.title
        , description: project.parseMarkdown(file.description)
        , template: 'code'
        , outPath: outPath
        , href: href
        , prepared: comments
      };

      result = _.merge(defaults, result);
      project.emit([ 'register', 'file' ], result);
      project.emit([ 'register', 'group' ], 'code', result);
      next();
    });
  }, cb);
};
