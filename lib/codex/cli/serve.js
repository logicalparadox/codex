
program
  .command('serve')
  .desc('start a static server to view your codex')
  .option('-d, --dir [{cwd}/out]', 'directory to serve')
  .option('-p, --port [8080]', 'port to serve on')
  .option('-m, --mount [/]', 'url path to mount to. include slash')
  .action(function (argv) {
    var cwd = argv.cwd
      , dir = argv.param('d', 'dir') || 'out'
      , mount = argv.param('m', 'mount') || '/'
      , port = argv.param('p', 'port') || 8080

    var fs = require('fsagent')
      , path = require('path')

    if (!fs.isPathAbsolute(dir)) {
      dir = path.resolve(cwd, dir);
    }

    program.header();

    l();
    l('SERVE'.magenta);
    l(dir.gray);
    l();

    serve({
        dir: dir
      , port: port
      , mount: mount
    }, function () {
      l('http://localhost:' + port + mount);
    })
  });
