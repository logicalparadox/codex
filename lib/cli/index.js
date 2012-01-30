var Drip = require('drip')
  , Tea = require('tea')
  , colors = require('./colors');

var log = new Tea.Logger({
    levels: 'syslog'
  , namespace: 'codex'
  , transports: [
        'console'
    ]
});


var cli = module.exports = new Drip({ wildcard: true });

function pad(str, width) {
  return Array(width - str.length).join(' ') + str;
}

var help = [
  // HELP
  { name: 'help'
  , description: 'View a list of commands on options'
  },

  // SERVE
  { name: 'serve'
  , description: 'Starts a static server to view the generated files.'
  , options: [
        { '-p, --port [n]': 'Specify port. Defaults to 3030.' }
      , { '-d, --dir [outDir]': 'Specify the directory to use.' }
    ]
  }
];


cli.on([ 'help' ], function () {
  var w = 15;

  log.info('');
  log.info('CODEX HELP'.magenta);
  log.info('');

  log.info('Options Defaults'.red);
  log.info('   inDir: '.green + '[cwd]'.gray);
  log.info('   outDir: '.green + '[cwd]/out'.gray);
  log.info('');

  help.forEach(function (c) {
    log.info(c.description.cyan);
    log.info(pad('', 4) + 'codex '.gray + c.name.green +
          ((c.commands) ? ' <command>'.magenta : '') +
          (c.options ?   ' <options>'.red : ''));

    if (c.options) {
      c.options.forEach(function (option) {
        for (var opt in option) {
          log.info(pad('', 6) + opt.red + ' ' + option[opt].gray);
        }
      });
    }
    log.info('');
  });
});
