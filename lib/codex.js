var Project = require('./core/project');

var exports = module.exports = function (opts) {
  var proj = new Project(opts);
  return proj;
};

exports.version = '0.1.0';

exports.Project = Project;
exports.Template = require('./core/template');

exports.Cli = require('./cli/index');