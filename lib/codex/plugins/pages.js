var _ = require('../utils')
  , fs = require('fsagent')
  , path = require('path')
    , join = path.join
  , yaml = require('yaml');

module.exports = function (project, config, cb) {
  var dataDir = config.pages
    , outDir = project.config.outDir;

  fs.tree(config.pages, function (err, results) {
    if (err) return cb(err);

    var fileNames = [];

    results.forEach(function (res) {
      var filename = path.basename(res).replace(path.extname(res), '');
      if (filename != 'index') filename = filename + '/index';

      var outPath = (path.dirname(res) + '/' + filename + '.html').replace(dataDir, outDir)
        , href = path.dirname(outPath).replace(outDir, '') + '/'
        , shortName = res.replace(dataDir, '')
        , template = outPath.replace(outDir, '').split('/')[1].split('.')[0]
        , group = (shortName.split('/').length == 2)
          ? 'root'
          : template
        , markdown = fs.readFileSync(res, 'utf8')
        , yml = markdown.match(/^-{3}((.|\n)*)-{3}/g)
        , defaults = {
              title: ''
            , template: template
            , 'render-file': true
          }

      if (yml) {
        var props = yaml.eval(yml[0]);
        markdown = markdown.replace(/^-{3}((.|\n)*)-{3}/g, '');
        defaults = _.defaults(props, defaults);
      }

      var result = {
          inPath: res
        , inFile: shortName
        , outPath: outPath
        , href: href
        , prepared: project.parseMarkdown(markdown)
      };

      result = _.merge(defaults, result);
      fileNames.push(shortName);

      if (result['render-file']) {
        project.emit([ 'register', 'file' ], result);
      }

      project.emit([ 'register', 'group' ], group, result);
    });

    cb(null);
  });

};
