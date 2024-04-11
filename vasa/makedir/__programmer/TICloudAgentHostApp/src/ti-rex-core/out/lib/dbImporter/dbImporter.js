"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbImport = void 0;
const fse = require("fs-extra");
const path = require("path");
const os = require("os");
const appConfig_1 = require("../appConfig");
const vars_1 = require("../vars");
const sqldbImporter_1 = require("./sqldbImporter");
const contentImporter_1 = require("./contentImporter");
const rexError_1 = require("../../utils/rexError");
const dbUpdateInfo_1 = require("./dbUpdateInfo");
const logger_1 = require("../../utils/logger");
const sqldb_1 = require("../../sqldb/sqldb");
async function dbImport(args) {
    const dinfraPath = args.dinfra;
    const dconfigPath = args.dconfig;
    const appconfigPath = args.appconfig;
    const appconfigCmdlineOverrides = {
        dbTablePrefix: args.dbTablePrefix,
        useConsole: args.useConsole
    };
    // Determine if we are logging to a file or not before printing anything to the console
    // Note that dconfig.paths.data is currently '/home/auser/ccs-cloud-storage'
    // and PE wants these logs in $HOME/ccs-cloud-storage/logs/<machine_instance>/tirex/
    const dconfig = require(dconfigPath);
    let cleanupConsoleLogging;
    if (dconfig.paths.data) {
        const dir = path.join(dconfig.paths.data, 'logs', os.hostname(), 'tirex');
        console.log(`Capturing log output in log file in ${dir}`);
        cleanupConsoleLogging = logConsoleToFile(dir);
    }
    const { dinfra } = await (0, appConfig_1.configureDinfraAndVars)(dinfraPath, dconfigPath, appconfigPath, appconfigCmdlineOverrides);
    const logger = (0, logger_1.createLogger)(dinfra, 'tirexDbImporter');
    dinfra.dlog.console();
    logger.info(`Using dinfra at ${dinfraPath}`);
    logger.info(`Using dconfig at ${dconfigPath}`);
    logger.info(`Using appconfig at ${appconfigPath}`);
    try {
        if (args.switchTablePrefix) {
            if (vars_1.Vars.DB_TABLE_PREFIX !== vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
                throw new rexError_1.RexError({
                    message: `Not switching table prefix because override is in effect to not use managed tables. Current DB table prefix: ${vars_1.Vars.DB_TABLE_PREFIX}.`
                });
            }
            // only switch table prefix info and return
            // tirex needs to be restarted afterwards to pick up the new table
            const oppositeTablePrefix = await getOppositeTablePrefix(dinfra);
            await (0, dbUpdateInfo_1.setLastUpdateInfo)(dinfra, oppositeTablePrefix);
            logger.info(`Switching the 'live' DB table prefix to ${oppositeTablePrefix}.`);
            const info = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
            logger.info('New fetched table prefix: ', info);
            logger.info('Restart tirex to make the new prefix live.');
        }
        else {
            // We explicitly import the content first so that we can't have metadata refer to content
            // that doesn't exist.  Regardless of if the publish step is decoupled, if metadata were
            // inserted first, then it could successfully import, but the content import could fail,
            // and then publish would publish something that wouldn't have content backing it up.
            logger.info('Starting DB Import');
            if (!args.skipContent) {
                await (0, contentImporter_1.contentImport)(dinfra, vars_1.Vars.CONTENT_BASE_PATH, vars_1.Vars.DB_RESOURCE_PREFIX, {
                    appendOnly: args.appendOnly,
                    verboseLogging: args.verboseLogging,
                    strictValidation: args.strictValidation,
                    configFile: args.contentConfigFile,
                    dryRun: args.dryRun,
                    quiet: args.quiet
                });
            }
            if (!args.skipMetadata) {
                const dbLastUpdateInfo = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
                // Determine the table prefix to import to
                let importTablePrefix;
                if (vars_1.Vars.DB_TABLE_PREFIX === vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
                    // auto-manage tables
                    importTablePrefix = await getOppositeTablePrefix(dinfra);
                    logger.info(`Importing into the non-live table ${importTablePrefix}. The live table ${dbLastUpdateInfo.liveTablePrefix} will not be modified.`);
                }
                else {
                    importTablePrefix = vars_1.Vars.DB_TABLE_PREFIX;
                    logger.warning(`Override to not use managed tables. Importing into table ${importTablePrefix}.`);
                }
                const sqldb = await sqldb_1.SqlDb.instance({ dinfraPath, tablePrefix: importTablePrefix });
                // Determine which packages to import
                const include = await resolveArray(args.include);
                const exclude = await resolveArray(args.exclude);
                // Do the import
                const dbPathToImport = args.dbPathOverride_forTestingOnly
                    ? args.dbPathOverride_forTestingOnly
                    : vars_1.Vars.DB_BASE_PATH;
                const dBPathPreviouslyImported = path.join(vars_1.Vars.DB_BASE_PATH, '..', `db-${importTablePrefix}`);
                const operationPerformed = await (0, sqldbImporter_1.metadataImport)(dinfra, sqldb, dbPathToImport, dBPathPreviouslyImported, {
                    include,
                    exclude,
                    incremental: args.incremental,
                    notify_forTestingOnly: args.notify_forTestingOnly,
                    verboseLogging: args.verboseLogging,
                    dryRun: args.dryRun,
                    quiet: args.quiet
                });
                if (operationPerformed) {
                    logger.info(`DB Import Into Table ${importTablePrefix} Successful!`);
                    // Keep the DB around that was just imported into table prefix
                    // (needed for incremental import)
                    if (!args.noDbCopies) {
                        // noDbCopies=true: Workaround for REX-3147 to conserve limited disk space on
                        // production. This will effectively disable incremental import.
                        logger.info(`Copying ${dbPathToImport} to ${dBPathPreviouslyImported}`);
                        await fse.remove(dBPathPreviouslyImported);
                        await fse.copy(dbPathToImport, dBPathPreviouslyImported);
                    }
                }
            }
            if (cleanupConsoleLogging) {
                // note: may need to comment out the below function if using debugger
                // (for some reason this function fails - maybe because the debugger is re-directing
                // the console too?)
                await cleanupConsoleLogging();
            }
        }
    }
    catch (e) {
        logger.error(e);
        console.error(e);
        throw e;
    }
    finally {
        dinfra.shutdown(0);
    }
}
exports.dbImport = dbImport;
async function getOppositeTablePrefix(dinfra) {
    const dbLastUpdateInfo = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
    let oppositeTablePrefix;
    if (dbLastUpdateInfo == null || !dbLastUpdateInfo.liveTablePrefix) {
        oppositeTablePrefix = vars_1.Vars.DB_TABLE_PREFIX_0;
    }
    else if (dbLastUpdateInfo.liveTablePrefix === vars_1.Vars.DB_TABLE_PREFIX_1) {
        oppositeTablePrefix = vars_1.Vars.DB_TABLE_PREFIX_0;
    }
    else if (dbLastUpdateInfo.liveTablePrefix === vars_1.Vars.DB_TABLE_PREFIX_0) {
        oppositeTablePrefix = vars_1.Vars.DB_TABLE_PREFIX_1;
    }
    else {
        throw new rexError_1.RexError({
            message: `Unrecognized table prefix ${dbLastUpdateInfo.liveTablePrefix}. Cannot auto-manage tables. Expected ${vars_1.Vars.DB_TABLE_PREFIX_0} or ${vars_1.Vars.DB_TABLE_PREFIX_1}`
        });
    }
    return oppositeTablePrefix;
}
async function resolveArray(array) {
    return array && array[0] && array[0].endsWith('.json') ? fse.readJSON(array[0]) : array;
}
// Override the "write" method of the supplied string to additionally write to
// the file specified.  Returns a function to flush and revert to normal operation
function logStreamToFile(stream, file) {
    const fileStream = fse.createWriteStream(file);
    const write = stream.write;
    stream.write = (...args) => {
        fileStream.write.call(fileStream, ...args);
        return write.call(stream, ...args);
    };
    function cleanup() {
        return new Promise(resolve => {
            stream.write = write;
            fileStream.end('', resolve);
        });
    }
    return cleanup;
}
// Log stdout/stderr contents to a file.  Returns a function to flush and revert to
// normal operation
function logConsoleToFile(directory) {
    const timestamp = new Date().toISOString();
    fse.ensureDirSync(directory);
    const cleanupFuncs = [
        logStreamToFile(process.stdout, path.join(directory, `import_${timestamp}.log`)),
        logStreamToFile(process.stderr, path.join(directory, `import_${timestamp}.err`))
    ];
    function cleanup() {
        return Promise.all(cleanupFuncs.map(f => f()));
    }
    return cleanup;
}
