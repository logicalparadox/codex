var Drip = require('drip')
  , Tea = require('tea')
  , colors = require('./colors');

var codex = require('../../codex.js');

var log = new Tea.Logger({
    levels: 'syslog'
  , namespace: 'codex'
  , transports: [
        'console'
    ]
});


var cli = module.exports = new Drip({ delimeter: ' ' });

function pad(str, width) {
  return Array(width - str.length).join(' ') + str;
}

var help = [
  // HELP
  { name: 'help'
  , description: 'View a list of commands on options'
  },

  { name: 'build'
  , description: 'Render your codex.'
  , options: [
        { '-i, --in [inDir]': 'Specify the root directory for your project' }
      , { '-o, --out [outDir]': 'Specify the path where generated files should placed' }
      , { '-t, --template [templateDir]': 'Specify the path to use as the project template' }
      , { '-d, --data [dataDir]': 'Specify the location where project data files are located' }
    ]
  },

  // SERVE
  { name: 'serve'
  , description: 'Starts a static server to view the generated files.'
  , options: [
        { '-p, --port [n]': 'Specify port. Defaults to 3030.' }
      , { '-d, --dir [outDir]': 'Specify the directory to use.' }
    ]
  },

  // SKELETON
  { name: 'skeleton'
  , description: 'Create a skeleton site using the codex provided template'
  , options: [
        { '-d, --dir [cwd]': 'Specify the directory to load files too.' }
    ]
  }
];

cli.on('--version', function () {
  console.log(codex.version);
});

cli.on('--help', function () {
  var w = 15;

  i = function (s) {
    console.log('  ' + s);
  };

  i('');
  i('');
  i('CODEX HELP'.magenta);
  i('');
  i('');
  i('Options Defaults');
  i('   inDir:       '.red + '[cwd]'.gray);
  i('   outDir:      '.red + '[cwd]/out'.gray);
  i('   dataDir:     '.red + '[cwd]/data'.gray);
  i('   templateDir: '.red + '[cwd]/template'.gray);
  i('');

  help.forEach(function (c) {
    i(c.description.blue);
    i(pad('', 4) + 'codex '.gray + c.name.green +
          ((c.commands) ? ' <command>'.magenta : '') +
          (c.options ?   ' <options>'.red : ''));

    if (c.options) {
      c.options.forEach(function (option) {
        for (var opt in option) {
          i(pad('', 6) + opt.red + ' ' + option[opt].gray);
        }
      });
    }
    i('');
  });
  i('');
  process.exit();
});
