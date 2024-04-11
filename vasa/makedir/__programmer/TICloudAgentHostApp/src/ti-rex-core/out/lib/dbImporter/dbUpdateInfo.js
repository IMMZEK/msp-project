"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDatabaseUpdateHandler = exports.notifyDatabaseUpdated = exports._getLastUpdateResourceName = exports.fetchLastUpdateInfo = exports.fetchLastUpdateInfoCb = exports.setLastUpdateInfo = void 0;
const logger_1 = require("../../utils/logger");
const vars_1 = require("../vars");
const util_1 = require("util");
const rexError_1 = require("../../utils/rexError");
/**
 * Set the last update timestamp to the current time.  This time is written to the database.
 *
 * @param dinfra
 * @param liveTablePrefix
 */
async function setLastUpdateInfo(dinfra, liveTablePrefix) {
    let _liveTablePrefix;
    if (liveTablePrefix) {
        _liveTablePrefix = liveTablePrefix;
    }
    else {
        if (vars_1.Vars.DB_TABLE_PREFIX === vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
            throw new rexError_1.RexError({ message: 'Must specify liveTablePrefix when auto managed' });
        }
        _liveTablePrefix = vars_1.Vars.DB_TABLE_PREFIX;
    }
    const resource = await getLastUpdateResource(dinfra);
    resource.setMeta(vars_1.Vars.DB_META_KEY, {
        timestamp: new Date().getTime(),
        liveTablePrefix: _liveTablePrefix
    });
    await resource.close();
}
exports.setLastUpdateInfo = setLastUpdateInfo;
/**
 * Fetch the time when the database was last updated.  This time is stored within the database to ensure it's the same
 * across all landscapes/running instances
 *
 * @param dinfra
 */
exports.fetchLastUpdateInfoCb = (0, util_1.callbackify)(fetchLastUpdateInfo);
async function fetchLastUpdateInfo(dinfra) {
    const resource = await getLastUpdateResource(dinfra);
    const meta = resource.getMeta(vars_1.Vars.DB_META_KEY);
    await resource.close();
    return meta;
}
exports.fetchLastUpdateInfo = fetchLastUpdateInfo;
function getLastUpdateResource(dinfra) {
    // Note that we use <prefix>Info as our prefix, not <prefix>/Info, as we don't want this
    // resource to appear in our content
    return dinfra.openResource(_getLastUpdateResourceName(), {
        create: true,
        meta: {
            [vars_1.Vars.DB_META_KEY]: { timestamp: 0, liveTablePrefix: null }
        }
    });
}
// The following are functions vs constants so that vars is valid when called
// exported only for testing
function _getLastUpdateResourceName() {
    return `${vars_1.Vars.DB_RESOURCE_PREFIX}Info/lastUpdate`;
}
exports._getLastUpdateResourceName = _getLastUpdateResourceName;
function getUpdateDBTopic() {
    return `${vars_1.Vars.DB_RESOURCE_PREFIX}/updateDBTopic`;
}
/**
 * Send an event to indicate that the database was just updated
 * Note: this can only be called after a dinfra session has been registered
 *
 * @param dinfra
 */
function notifyDatabaseUpdated(dinfra) {
    new dinfra.TopicEmitter().withTopic(getUpdateDBTopic()).emit('databaseUpdated');
}
exports.notifyDatabaseUpdated = notifyDatabaseUpdated;
/**
 * Register a handler for when the database is updated
 * Note: this can only be called after a dinfra session has been registered
 *
 * @param dinfra
 * @param handler
 */
function registerDatabaseUpdateHandler(dinfra, handler) {
    new dinfra.TopicEmitter()
        .withTopic(getUpdateDBTopic())
        .on('error', error => logger_1.logger.error('Error on updateDBTopic', error))
        .on('databaseUpdated', handler);
}
exports.registerDatabaseUpdateHandler = registerDatabaseUpdateHandler;
