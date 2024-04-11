'use strict';
// tslint:disable-next-line no-var-requires
// require('source-map-support').install();
// require('longjohn');
require('../shared/placeholder'); // DO NOT REMOVE; used to ensure depth in output dir is consistent
const yargs = require('yargs');
yargs
    .usage('Usage: $0 <command> [options]')
    .command(require('./handoff-client/add-package'))
    .command(require('./handoff-client/remove-package'))
    .command(require('./ccs-dependent/test-project'))
    .command(require('./ccs-dependent/test-projects'))
    .command(require('./ccs-dependent/test-projects-cloud'))
    .command(require('./generate-project-metadata'))
    .command(require('./db-import'))
    .command(require('./db-refresh-all'))
    .command(require('./create-sitemap'))
    .command(require('./schema-validation'))
    .command(require('./url-validation'))
    .command(require('./create-contentMap'))
    .command(require('../lib/dbBuilder/db-stats'))
    .demandCommand(1)
    .help('h')
    .alias('h', 'help')
    .strict() // report invalid options
    .parse();
