var Oath = require('oath');

module.exports = function (project, config) {
  var promise = new Oath();
  promise.resolve({ name: 'pages' });
  return promise.promise;
};