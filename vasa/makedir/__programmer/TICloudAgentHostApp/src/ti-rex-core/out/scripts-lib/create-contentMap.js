/* eslint no-console: "off" */
'use strict';
const util = require('./util');
const path = require('path');
const DINFRA_PATH_DEFAULT = `../../dinfra-library/lib/dinfra.js`;
const DCONFIG_PATH_DEFAULT = `../../tirex4-dconfig.json`;
const APPCONFIG_PATH_DEFAULT = `../../tirex4-sconfig.json`;
//
// Yargs Command config
//
exports.handler = function (argv) {
    const contentMapGenerator = require('../lib/contentMapGenerator');
    argv.dinfra = util.resolvePath(argv.dinfra);
    argv.dconfig = util.resolvePath(argv.dconfig);
    argv.appconfig = util.resolvePath(argv.appconfig);
    contentMapGenerator.createContentMap(argv).catch((e) => {
        console.error('An error has occurred during create contentMap');
        console.error(e);
        process.exit(1);
    });
};
exports.command = `${path.basename(__filename, '.js')} [options]`;
exports.describe =
    'Create a file that maps content routes to an approriate explore link and storing it in a file';
exports.builder = {
    dinfra: {
        describe: 'path to dinfra.js (relative or absolute)',
        demandOption: false,
        default: DINFRA_PATH_DEFAULT
    },
    dconfig: {
        describe: 'path to dconfig file (relative or absolute)',
        demandOption: false,
        default: DCONFIG_PATH_DEFAULT
    },
    appconfig: {
        describe: 'path to the app config file (relative or absolute)',
        demandOption: false,
        default: APPCONFIG_PATH_DEFAULT
    }
};
