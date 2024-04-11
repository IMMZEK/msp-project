"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemovePackage = void 0;
const _ = require("lodash");
const util = require("./util");
const handoff_logs_1 = require("./handoff-logs");
const errors_1 = require("../shared/errors");
const db_release_and_import_1 = require("./db-release-and-import");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class RemovePackage {
    packageManagerAdapter;
    refreshFn;
    loggerManager;
    defaultLog;
    vars;
    constructor(packageManagerAdapter, refreshFn, loggerManager, defaultLog, vars) {
        this.packageManagerAdapter = packageManagerAdapter;
        this.refreshFn = refreshFn;
        this.loggerManager = loggerManager;
        this.defaultLog = defaultLog;
        this.vars = vars;
    }
    async removePackage(params) {
        let err = null;
        // Fetch the entry + email
        let email = params.email;
        let entry = null;
        try {
            const results = await this.packageManagerAdapter
                ._getPackageManager()
                .getDeleteEntries(params.packageInfo.id, params.packageInfo.version, this.defaultLog);
            const result = _.first(results);
            if (result) {
                email = [...email.split(','), result.email].join(',');
                entry = result;
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Setup the logs
        let log = null;
        let refreshLog = null;
        let refreshOut = null;
        let onSubmissionDone = null;
        try {
            const result = await (0, handoff_logs_1.manageLogsDeletion)({
                submissionId: params.submissionId,
                email,
                loggerManager: this.loggerManager
            });
            ({ log, refreshLog, refreshOut, onSubmissionDone } = result);
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // If we don't have an error remove the package
        let stageDone = false;
        let refreshSuccess = false;
        try {
            // Stage
            if (!err && log) {
                log.debugLogger.info(`RemovePackage - Staging remove ${JSON.stringify(params.packageInfo)}`);
                await this.packageManagerAdapter.stageRemovePackage({
                    packageInfo: params.packageInfo,
                    log
                });
            }
            stageDone = true;
            // Process
            if (!err && log && refreshLog && entry && onSubmissionDone) {
                log.debugLogger.info(`RemovePackage - refreshing ${JSON.stringify(entry)}`);
                const refreshParams = await util.getRefreshParams([{ entry, request: 'remove' }], await this.packageManagerAdapter.getAllEntries(log), this.vars.contentBasePath, this.vars.zipsFolder);
                const passed = await this.refreshFn(refreshParams, refreshLog);
                if (!passed) {
                    err = util.getCombinedError(err, new errors_1.GracefulError('Packages failed to process'));
                }
                refreshSuccess = passed;
            }
            // Remove
            if (stageDone && log) {
                log.debugLogger.info(`RemovePackage - Doing package remove ${JSON.stringify(params.packageInfo)}`);
                await this.packageManagerAdapter.removePackage({
                    packageInfo: params.packageInfo,
                    log,
                    processingSuccess: refreshSuccess
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Cleanup
        // Note we don't rollback, refresh will handle failed removes
        // packagManagerAdapter will handle adding the entry back based on processingSuccess
        try {
            // Close the refresh log + stream so we can attach the file to the email
            // We shouldn't add anything to it after this point
            if (refreshLog) {
                refreshLog.closeLoggers();
            }
            await new Promise((resolve) => {
                if (refreshOut && refreshOut.writable) {
                    refreshOut.end(resolve);
                }
                else {
                    resolve();
                }
            });
            await this._postProcessingPlaceholderForTesting();
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Call onSubmissionDone
        try {
            if (onSubmissionDone) {
                (log || this.defaultLog).debugLogger.info(`RemovePackage - Calling onSubmissionDone ${JSON.stringify(params.packageInfo)}`);
                await onSubmissionDone({
                    err,
                    refreshSuccess,
                    stageDone,
                    emailTag: `${params.packageInfo.id}__${params.packageInfo.version}`,
                    handoffChecklistValid: true
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // DB publishing
        try {
            if (!err && log) {
                log.debugLogger.info(`RemovePackage - doing dbImportAndPublish ${JSON.stringify(params.packageInfo)}`);
                await (0, db_release_and_import_1.dbImportAndPublish)(params.email, 'remove', this.vars.dbBasePath, log, `${params.packageInfo.id}__${params.packageInfo.version}`);
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Close the loggers
        if (log) {
            log.closeLoggers();
        }
        // Pass the error up
        if (err) {
            throw err;
        }
    }
    // For test purposes only
    async _postProcessingPlaceholderForTesting() { }
}
exports.RemovePackage = RemovePackage;
