/*!
 * Codex - CLI
 * Copyright (c) 2012 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var codex = require('../../codex')
  , electron = require('electron');

/*!
 * Expose log helper
 */

l = function (str) {
  str = str || '';
  console.log('  ' + str);
}

pad = function (str, width) {
  return str + Array(width - str.length).join(' ');
}

/*!
 * Create an electron based cli
 */

program = electron('codex')
  .name('Codex')
  .desc('https://github.com/logicalparadox/codex')
  .version(codex.version);

/*!
 * Codex cli log header
 */

program.header = function () {
  program.colorize();
  console.log('');
  console.log('  Welcome to ' + 'Codex'.gray);
  console.log('  It worked if it ends with ' + 'Codex'.gray + ' ok'.green);
};

/*!
 * Codex cli log footer ok
 */

program.footerOk = function () {
  program.colorize();
  console.log('  ' + 'Codex '.gray + 'ok'.green);
  console.log('');
  process.exit();
};

/*!
 * Codex cli log footer not ok
 */

program.footerNotOk = function () {
  program.colorize();
  console.log('  ' + 'Codex '.gray + 'not ok'.red);
  console.log('');
  process.exit(1);
};

/*!
 * Serve helper
 */

serve = function (opts, cb) {
  var dir = opts.dir
    , port = opts.port
    , mount = opts.mount || '';

  var connect = require('connect')
     , app = connect()

  app.use(mount, connect.static(dir));
  app.listen(port, cb);
};

/*!
 * Load all the CLI submodules
 */

require('./build');
require('./watch');
require('./serve');
require('./create');

/*!
 * Primary Export
 */

module.exports = program;
