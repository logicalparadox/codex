var should = require('chai').should()
  , path = require('path')
  , fs = require('fsagent');

var codex = require('..');

function onError (e) {
  should.not.exist(e);
  true.should.be.false;
}

describe('Project', function () {

  var project = codex({
      locals: {
        title: 'Hello Universe'
      }
    , inDir: path.join(__dirname, 'fixture')
  });

  var out = path.join(__dirname, 'fixture', 'out')
    , temp = path.join(__dirname, 'fixture', 'template');

  beforeEach(function () {
    project.removeAllListeners('error');
  });

  after(function (done) {
    fs.rimraf(out, done);
  });

  it('should have a version', function () {
    codex.version.should.match(/\d+\.\d+\.\d+$/);
  });

  it('should correctly initialize', function () {
    project.config.inDir.should.be.ok;
  });

  it('should correctly build', function (done) {
    project.on('error', onError);
    project.build(function () {
      fs.existsSync(out).should.be.true;
      fs.existsSync(path.join(out, 'public/css/main.css')).should.be.true;
      done();
    });
  });
});
