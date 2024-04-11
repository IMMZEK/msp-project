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
    const dbRefresh = require('../lib/dbBuilder/dbRefreshAllScript');
    argv.dinfra = util.resolvePath(argv.dinfra);
    argv.dconfig = util.resolvePath(argv.dconfig);
    argv.appconfig = util.resolvePath(argv.appconfig);
    dbRefresh
        .dbRefreshAllScript(argv)
        .catch((e) => {
        console.error('An error has occurred during DB refresh');
        console.error(e);
        process.exit(1);
    })
        .then(() => {
        process.exit(0);
    });
};
exports.command = `${path.basename(__filename, '.js')} [options]`;
exports.describe =
    'Re-discover all packages in the content folder and do a clean refresh. The path locations are taken from the ' +
        'appconfig properties contentPath and dbPath.';
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
    },
    rediscoverOnly: {
        describe: 'Re-discover packages and re-generate package manager file only and do not refresh DB',
        boolean: true,
        default: false
    },
    defaultJson: {
        describe: 'Use default.json instead of re-discover the package manager file',
        boolean: true,
        default: false
    },
    // validationType parameter name must match the name in the AppConfig type
    validationType: {
        describe: 'There are four validationTypes: schema: only do schema validation; refresh: perform schema validation and refresh; ' +
            'url: do url validation for all packages in the latest version; all: implement schema validation, url validation and refresh. ' +
            'Data validation is included in the refresh process.',
        default: 'refresh'
    },
    // contentPath parameter name must match the name in the AppConfig type
    contentPath: {
        describe: 'Overrides contentPath for validator and refresh. Default value is the same as the contentPath defined in app config file.'
    },
    noSyncPackages: {
        describe: "Don't update package-manager file based on the file system. Use this to refresh a subset of packages.",
        boolean: true,
        default: false
    }
};
