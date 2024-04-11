"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processConfig = exports.configureDinfraAndVars = exports.tirexDatabasesDefaults = void 0;
const os = require("os");
const path = require("path");
const logger_1 = require("../utils/logger");
const rexError_1 = require("../utils/rexError");
const util_1 = require("../shared/util");
const vars_1 = require("./vars");
// TODO: Instead of hard-coding this can it be added to the dcontrol object that's added to the
// app_default.json by dccontrol? Figure out how this works on the landscape
exports.tirexDatabasesDefaults = {
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: true
};
/**
 * Configure dinfra, vars, and global default logger named 'tirex'
 *
 * (using this function ensures only vars is used instead of config)
 * TODO: should eventually also be used in app.ts once it is refactored
 */
async function configureDinfraAndVars(dinfraPath, dconfigPath, configFile, configCmdlineOverrides) {
    const dinfra = require(dinfraPath);
    const dconfig = require(dconfigPath);
    if (dconfig.databases &&
        dconfig.databases.defaults &&
        dconfig.databases.defaults.type === 'mysql') {
        Object.assign(dconfig.databases.defaults, exports.tirexDatabasesDefaults);
    }
    const appconfig = require(configFile);
    const config = processConfig(appconfig, configCmdlineOverrides);
    const logger = (0, logger_1.createDefaultLogger)(dinfra);
    logger.setPriority(dinfra.dlog.PRIORITY.INFO);
    if (config.useConsole === 'true') {
        // duplicate all messages to console; set already when using dcontrol run
        dinfra.dlog.console();
    }
    try {
        await dinfra.configure(dconfig);
    }
    catch (e) {
        logger.critical(e);
        dinfra.shutdown(1);
        throw new rexError_1.RexError({ message: 'Error while configuring dinfra', causeError: e });
    }
    // prefix some paths with the dinfra locations
    if (dinfra.paths) {
        if (dinfra.paths.data) {
            if (config.contentPath) {
                config.contentPath = path.join(dinfra.paths.data, config.contentPath);
            }
            if (config.dbPath) {
                config.dbPath = path.join(dinfra.paths.data, config.dbPath);
            }
            if (config.seoPath) {
                config.seoPath = path.join(dinfra.paths.data, config.seoPath);
            }
        }
    }
    const vars = new vars_1.Vars(config);
    return { dinfra, vars, logger };
}
exports.configureDinfraAndVars = configureDinfraAndVars;
function processConfig(configPassedIn, configCmdlineOverrides = {}) {
    const config = {
        ...require('../../config/app_default.json'),
        ...configPassedIn
    };
    (0, util_1.getObjectKeys)(config).forEach((prop) => {
        if (configCmdlineOverrides[prop]) {
            (0, util_1.setValueForPair)(config, configCmdlineOverrides, prop, (value) => value);
        }
    });
    (0, util_1.getObjectKeys)(config).forEach((prop) => {
        (0, util_1.setValueForPair)(config, config, prop, (configValue) => {
            if (typeof configValue === 'string' && configValue !== '') {
                if (configValue.indexOf('http') === 0 || prop === 'dbResourcePrefix') {
                    // not a file path, use as-is
                    return configValue;
                }
                const p = path.normalize(configValue).split(path.sep);
                // resolve '~' (linux and win) to user home dir
                if (p[0] === '~') {
                    p[0] = os.homedir();
                }
                else if (p[0] === '') {
                    p[0] = '/';
                }
                // resolve environment variables
                for (let i = 0; i < p.length; i++) {
                    if (p[i][0] === '$') {
                        const evar = p[i].substr(1);
                        if (process.env[evar]) {
                            p[i] = process.env[evar];
                        }
                    }
                }
                return p.reduce((a, b) => path.join(a, b));
            }
            else {
                return configValue;
            }
        });
    });
    return config;
}
exports.processConfig = processConfig;
