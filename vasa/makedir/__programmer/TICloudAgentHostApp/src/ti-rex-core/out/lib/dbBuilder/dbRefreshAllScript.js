"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbRefreshAllScript = void 0;
const vars_1 = require("../vars");
const appConfig_1 = require("../appConfig");
const logger_1 = require("../../utils/logger");
const logging_1 = require("../../utils/logging");
const handoff_manager_1 = require("../../handoff/handoff-manager");
const package_manager_1 = require("../../handoff/package-manager");
const util_1 = require("../../handoff/util");
async function dbRefreshAllScript(args) {
    const dinfraPath = args.dinfra;
    const dconfigPath = args.dconfig;
    const appconfigPath = args.appconfig;
    const validationType = args.validationType;
    const appconfigCmdlineOverrides = {
        contentPath: args.contentPath
    };
    const { dinfra, vars } = await (0, appConfig_1.configureDinfraAndVars)(dinfraPath, dconfigPath, appconfigPath, appconfigCmdlineOverrides);
    const dinfraLogger = (0, logger_1.createLogger)(dinfra, 'tirexDbRefreshScript');
    dinfra.dlog.console();
    dinfraLogger.setPriority(dinfra.dlog.PRIORITY.INFO);
    const loggerManager = new logging_1.LoggerManager(dinfraLogger);
    const log = new logging_1.Log({
        userLogger: loggerManager.createLogger('refreshUser'),
        debugLogger: loggerManager.createLogger('refreshDebug')
    });
    const logger = log.userLogger;
    logger.info(`Using dinfra at ${dinfraPath}`);
    logger.info(`Using dconfig at ${dconfigPath}`);
    logger.info(`Using appconfig at ${appconfigPath}`);
    const handoffManager = new handoff_manager_1.HandoffManager({
        loggerManager,
        defaultLog: log,
        vars
    });
    const refreshManager = handoffManager.getRefreshManager();
    if (args.defaultJson) {
        logger.info(`Using default.json: ${vars.contentPackagesConfig}`);
        try {
            const { resultAsMap, success } = await refreshManager.refreshUsingConfigFile(vars.contentPackagesConfig, vars.dbBasePath, validationType);
            if (!success) {
                logger.error(JSON.stringify(resultAsMap));
                logger.error('Refresh FAILED!');
            }
            else {
                logger.info('SUCCESS!');
            }
        }
        catch (err) {
            logger.emergency(err);
            logger.emergency('Refresh failed with FATAL ERROR!');
        }
    }
    else {
        // re-discover packages and re-generate package manager file
        logger.info('Using package manager file: ' + vars_1.Vars.PACKAGE_MANAGER_FILE);
        if (!args.noSyncPackages) {
            await handoffManager.syncPackages();
        }
        if (!args.rediscoverOnly) {
            // refresh packages in package manager file
            const entries = await new package_manager_1.PackageManager(vars.packageManagerFile, vars.contentBasePath, vars.zipsFolder).getPackageEntries(log);
            const refreshParams = await (0, util_1.getRefreshParams)(entries.map(item => ({ entry: item, request: 'nothing' })), entries, vars.contentBasePath, vars.zipsFolder);
            logger.info(`Refreshing with params ${JSON.stringify(refreshParams)}`);
            try {
                const { result, success } = await refreshManager.individualRefresh(refreshParams, vars.contentBasePath, true, undefined, true, // forcing a full refresh here
                validationType);
                if (!success) {
                    logger.error(JSON.stringify(result));
                    logger.error('Refresh FAILED!');
                }
                else {
                    logger.info('SUCCESS!');
                }
            }
            catch (err) {
                logger.emergency(err);
                logger.emergency('Refresh failed with FATAL ERROR!');
            }
        }
    }
    dinfra.shutdown(0);
}
exports.dbRefreshAllScript = dbRefreshAllScript;
