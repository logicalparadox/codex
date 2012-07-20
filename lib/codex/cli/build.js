/*!
 * Codex - Build CLI
 * Copyright (c) 2012 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

program
  .command('build')
  .description('render your codex')
  .option('-i, --in [inDir]', 'project root directory instead of [cwd]')
  .option('-o, --out [outDir]', 'path where generated files should placed')
  .option('-t, --template [templateDir]', 'path to use as the project templates')
  .option('-d, --data [dataDir]', 'location where project data files are located')
  .action(function (argv) {
    var codex = require('../../codex')
      , fs = require('fsagent')
      , path = require('path')
      , join = path.join
      , opts = {};

    program.header();

    l();
    l('BUILD'.magenta);
    l();

    // parse options from argv
    opts.inDir = argv.param('i', 'in') || argv.cwd;
    opts.outDir = argv.param('o', 'out') || join(opts.inDir, 'out');
    opts.dataDir = argv.param('d', 'data') || join(opts.inDir, 'data');
    opts.templateDir = argv.param('t', 'template') || join(opts.inDir, 'template');

    // make sure all paths are absolute
    for (var dir in opts) {
      if (!fs.isPathAbsolute(opts[dir])) {
        opts[dir] = path.resolve(args.cwd, opts[dir]);
      }
      l(pad(dir, 14).blue + opts[dir].gray);
    }

    l();

    var project = codex(opts);
    project.build(function (err) {
      if (err) {
        l(err.message.red);
        l();
        program.footerNotOk();
      }

      program.footerOk();
    });
  });
