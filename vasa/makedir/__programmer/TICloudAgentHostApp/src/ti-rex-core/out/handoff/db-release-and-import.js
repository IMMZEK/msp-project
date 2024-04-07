"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbImportAndPublish = void 0;
const fse = require("fs-extra");
const path = require("path");
const child_process_1 = require("child_process");
const vars_1 = require("../lib/vars");
const util_1 = require("./util");
const getAppConfig_1 = require("../utils/getAppConfig");
const errors_1 = require("../shared/errors");
const dbImportCmd = `db-import --skipContent --incremental`;
const dbSwitchTablePrefixCmd = `db-import --switchTablePrefix`;
const statusTirex3Cmd = `dcontrol status tirex3`;
const stopTirex3Cmd = `dcontrol stop tirex3`;
const startTirex3Cmd = `dcontrol start tirex3`;
const statusTirex4Cmd = `dcontrol status tirex4`;
const restartTirex4Cmd = `dcontrol restart tirex4`;
const rediscoverCcsProductsCmd = `dcontrol install ide:initialize-ccs`;
/**
 * 1. rediscover CCS products (e.g. xdctools)
 * 2. publish db for tirex 3
 * 3. import db into tirex4 sqldb
 * 4. publish sqldb for tirex4
 *
 * Note: requires a dcontrol landscape which is set up on single machine (on a multi-
 * machine landscape dcontrol can only be used on the 'staging' machine)
 *
 * @param email
 * @param log
 */
async function dbImportAndPublish(email, refreshRequest, dbBasePath, log, emailTag) {
    const getMessageBody = manageLogs(log);
    const dbTirex3Live = path.join(dbBasePath, '..', 'db');
    const dbTirex3Backup = path.join(dbBasePath, '..', 'db.bkup');
    const dbStaged = dbBasePath;
    let err = null;
    try {
        await rediscoverCcsProducts(log);
        await dbPublishToTirex3(dbTirex3Live, dbTirex3Backup, dbStaged, log);
        await dbImportToTirex4(log);
        await dbPublishToTirex4(log);
    }
    catch (e) {
        err = (0, util_1.getCombinedError)(err, e);
    }
    finally {
        // Send out email
        const subject = err ? ` - Failed [${emailTag}]` : ` - Complete [${emailTag}]`;
        const attachments = [];
        if (err) {
            if (err instanceof errors_1.ErrorWithLog) {
                attachments.push({ path: err.logFile, filename: path.basename(err.logFile) });
                log.userLogger.info(`An error has occurred, see ${path.basename(err.logFile)}`);
            }
            else {
                log.userLogger.info('An error has occurred, see below for details');
            }
            log.userLogger.error(typeof err === 'string' ? err : err.stack || '');
        }
        const addMessage = 'Handoff successfully completed. The package should now be visible in Resource Explorer.';
        const removeMessage = 'Removal successfully completed. The package should no longer be visible in Resource Explorer.';
        await (0, util_1.sendEmail)(email, subject, (err ? '' : (refreshRequest === 'remove' ? removeMessage : addMessage) + '<br><br>') +
            getMessageBody(), log, refreshRequest === 'remove' ? 'remove' : 'add', attachments);
        // Cleanup attachments
        try {
            // Assume all attachments were in a unique subfolder
            await Promise.all(attachments.map((item) => fse.remove(path.dirname(item.path))));
        }
        catch (e) {
            log.debugLogger.warning('Unable to delete tmp folder');
            log.debugLogger.error(e);
        }
    }
    if (err) {
        throw err;
    }
}
exports.dbImportAndPublish = dbImportAndPublish;
function manageLogs(log) {
    let messageBody = '';
    log.userLogger.on('data', (message) => {
        message = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
        messageBody += (0, util_1.transformLogMessage)(message);
    });
    return () => {
        return messageBody;
    };
}
// TODO: this assumes landscape on single local machine for now since dcontrol can only be
//  used on the 'staging' server but not on the machine where tirex service is running
async function dbPublishToTirex3(dbTirex3Live, dbTirex3Backup, dbStaged, log) {
    // 1. if tirex3 service does not exist or is not running, don't proceed
    if (await isTirex3Off(log)) {
        throw new Error(`Tirex 3 service is not running`);
    }
    let err = null;
    try {
        // 2. stop tirex3 service
        await spawnCmd(stopTirex3Cmd, 'stopTirex3', log);
        if (!(await isTirex3Off(log))) {
            throw new Error(`Tirex 3 service could not be stopped`);
        }
        // 3. backup live db (mv db to db.bkup)
        await fse.remove(dbTirex3Backup);
        if (await fse.pathExists(dbTirex3Live)) {
            await fse.move(dbTirex3Live, dbTirex3Backup);
        }
        // 4. copy db-staged to db
        await fse.remove(dbTirex3Live);
        await fse.copy(dbStaged, dbTirex3Live);
    }
    catch (e) {
        err = e;
    }
    finally {
        // 5. start tirex3 service
        await spawnCmd(startTirex3Cmd, 'startTirex3', log);
        await delay(4000); // give dinfra registration some time
    }
    if (err) {
        throw err;
    }
    else if (!(await isTirex3On(log))) {
        throw new Error(`Tirex 3 service could not be started`);
    }
}
async function dbImportToTirex4(log) {
    const args = await getDbImportArgs();
    // note: this function may fail if using debugger (see note in dbImporter.ts)
    await spawnTirexScript(dbImportCmd + args, 'dbImport', log);
}
async function dbPublishToTirex4(log) {
    if (vars_1.Vars.DB_TABLE_PREFIX === vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
        // 1. switch tables for tirex4
        const args = await getDbImportArgs();
        await spawnTirexScript(dbSwitchTablePrefixCmd + args, 'switchTablePrefix', log);
    }
    // 2. restart tirex4
    await spawnCmd(restartTirex4Cmd, 'restartTirex4Cmd', log);
    await delay(4000); // give dinfra registration some time
    if (!(await isTirex4On(log))) {
        throw new Error(`Tirex 4 service could not be started`);
    }
}
async function rediscoverCcsProducts(log) {
    await spawnCmd(rediscoverCcsProductsCmd, 'rediscoverProducts', log);
}
/**
 * Executes a tirex-script command in a child process, returns the console output when done
 *
 * @param args
 */
async function spawnTirexScript(args, scriptTag, log) {
    const tirexScript = path.join(__dirname, '..', 'scripts-lib', 'tirex-scripts.js');
    return spawnCmd(`${process.execPath} --max-old-space-size=5120 ${tirexScript} ${args}`, scriptTag, log);
}
/**
 * Executes a command in a child process, returns the console output when done
 *
 * @param args
 */
async function spawnCmd(args, cmdTag, log, onMessage) {
    // Launch
    const argsArr = args.split(' ');
    const command = argsArr[0];
    const _args = argsArr.slice(1);
    log.debugLogger.info(`Launching "${args}"`);
    const cp = (0, child_process_1.spawn)(command, _args);
    // Setup log file
    const { logOut, logFile } = await (0, util_1.prepareLogFile)(vars_1.Vars.CONTENT_BASE_PATH, `${cmdTag}.log`);
    cp.stdout.pipe(logOut);
    cp.stderr.pipe(logOut);
    // Process handling
    await new Promise((resolve, reject) => {
        cp.stdout.on('data', (buf) => {
            const bufStr = buf.toString();
            if (onMessage) {
                onMessage(bufStr);
            }
        });
        cp.stderr.on('data', (buf) => {
            const bufStr = buf.toString();
            if (onMessage) {
                onMessage(bufStr);
            }
        });
        cp.on('error', reject);
        cp.on('disconnect', reject);
        cp.on('exit', (exitCode) => {
            const msg = `Spawned process "${args}" exited with error code ${exitCode}`;
            log.debugLogger.info(msg);
            if (exitCode === 0) {
                fse.remove(path.dirname(logFile)).then(() => resolve(), reject);
            }
            else {
                reject(new errors_1.ErrorWithLog(msg, logFile));
            }
        });
    });
}
/**
 * delay
 */
async function delay(time) {
    await new Promise((r) => setTimeout(r, time));
}
/**
 * Get args passed in to the current process, forward to the dbImportScript
 *
 */
async function getDbImportArgs() {
    const { dinfra, dconfig, appConfig } = await (0, getAppConfig_1.getAppConfig)();
    const args = (dinfra ? ` --dinfra=${dinfra}` : '') +
        (dconfig ? ` --dconfig=${dconfig}` : '') +
        (appConfig ? ` --appconfig=${appConfig}` : '');
    return args;
}
async function isTirex3On(log) {
    return checkCommandStatus(statusTirex3Cmd, 'on', 'tirex3Status', log);
}
async function isTirex3Off(log) {
    return checkCommandStatus(statusTirex3Cmd, 'off', 'tirex3Status', log);
}
async function isTirex4On(log) {
    return checkCommandStatus(statusTirex4Cmd, 'on', 'tirex4Status', log);
}
async function checkCommandStatus(command, status, cmdTag, log) {
    let isStatus = false;
    await spawnCmd(command, cmdTag, log, (message) => {
        if (message.indexOf(status) !== -1) {
            isStatus = true;
        }
    });
    return isStatus;
}
