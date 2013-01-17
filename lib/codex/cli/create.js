/*!
 * Codex - Create CLI
 * Copyright (c) 2012-2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

program
  .command('create *')
  .description('create an empty project')
  .action(function (argv) {
    var cwd = argv.cwd
      , name = argv.commands[1];

    var fs = require('fsagent')
      , ncp = require('ncp').ncp
      , path = require('path');

    program.header();

    var dir = path.join(cwd, name);

    l();
    l('CREATE'.magenta);
    l(dir.gray);
    l();

    if (fs.existsSync(dir)) {
      l('Target directory already exists.');
      program.footerNotOk();
    }

    ncp(path.join(__dirname, '../../../skeleton'), dir, function (err) {
      if (err && err.length) {
        l(err[0].message);
        program.footerNotOk();
      }

      program.footerOk();
    });
  });
