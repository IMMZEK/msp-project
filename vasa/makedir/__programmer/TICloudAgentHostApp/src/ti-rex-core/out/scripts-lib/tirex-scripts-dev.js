'use strict';
// tslint:disable-next-line no-var-requires
require('source-map-support').install();
// require('longjohn');
const yargs = require('yargs');
yargs
    .usage('Usage: $0 <command> [options]')
    // Common commands
    .command(require('./run-tirex'))
    .command(require('./test/run-tests'))
    // Additional commands
    .command(require('./test/generate-load-tests-report'))
    // Commands mainly for automation / jenkins
    .command(require('./jenkins/run-tests'))
    .command(require('./jenkins/wait-for-tirex'))
    .command(require('./jenkins/kill-tirex'))
    .demandCommand(1, 1)
    .help('h')
    .alias('h', 'help')
    .strict() // report invalid options
    .parse();
