"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPackage = void 0;
// 3rd party
const _ = require("lodash");
const path = require("path");
const fs = require("fs-extra");
// our modules
const vars_1 = require("../lib/vars");
const path_helpers_1 = require("../shared/path-helpers");
const util = require("./util");
const handoff_logs_1 = require("./handoff-logs");
const errors_1 = require("../shared/errors");
const prepare_handoff_1 = require("./prepare-handoff");
const promise_utils_1 = require("../utils/promise-utils");
const db_release_and_import_1 = require("./db-release-and-import");
const response_data_1 = require("../shared/routes/response-data");
const package_helpers_1 = require("./package-helpers");
const process_modules_1 = require("./process-modules");
const request_helpers_1 = require("../shared/request-helpers");
const handoff_checklist_helpers_1 = require("./handoff-checklist-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class AddPackage {
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
    async preAddPackage(params) {
        const { entries, submissionId, assetUploads, handoffQueued } = params;
        const email = _.uniq(entries.map((item) => item.email)).join(',');
        let err = null;
        let log = null;
        let refreshLog = null;
        let refreshOut = null;
        let onSubmissionDone = null;
        let submittedItems = null;
        const installLogFiles = [];
        try {
            // Setup the logs
            ({ log, refreshLog, refreshOut, onSubmissionDone } = await (0, handoff_logs_1.manageLogsSubmission)({
                loggerManager: this.loggerManager,
                email,
                submissionId
            }));
            const logInner = log;
            // Get the submitted items
            const uniqueAssetUploads = _.uniq(assetUploads.map((item) => item.originalname));
            if (uniqueAssetUploads.length !== assetUploads.length) {
                const msg = 'Some uploaded assets have the same name';
                util.logMessage(log.userLogger.error, msg);
                throw new errors_1.GracefulError('Invalid submission');
            }
            submittedItems = await (0, promise_utils_1.mapSerially)(entries, async (entry) => {
                const { assets, localAssets } = entry;
                if (!assets && !localAssets) {
                    const msg = 'No assets / localAssets specified in submission. Please check submission metadata.';
                    util.logMessage(logInner.userLogger.error, msg);
                    throw new errors_1.GracefulError('Invalid submission');
                }
                // only include the assets for the current entry
                const entryAssetUploads = assetUploads.filter((item) => !!Object.values(localAssets || {}).find((item2) => path.basename(item2) === item.originalname));
                return this.getSubmission(entryAssetUploads, entry, installLogFiles, logInner);
            });
            // Send out an email
            await this.sendProcessingStartedEmail(submittedItems, email, submissionId, handoffQueued(), log);
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Cleanup
        try {
            if (err) {
                // Close the refresh log + stream so we can attach the file to the email.
                // We shouldn't add anything to it after this point.
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
            }
            await Promise.all(assetUploads.map((item) => fs.remove(item.path)));
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Call onSubmissionDone if err
        try {
            if (onSubmissionDone && err) {
                (log || this.defaultLog).debugLogger.info(`AddPackage - Calling onSubmissionDone for submission ${submissionId}`);
                const emailTag = submissionId;
                await onSubmissionDone({
                    err,
                    refreshSuccess: false,
                    stageDone: false,
                    emailTag,
                    additonalAttachments: installLogFiles,
                    handoffChecklistValid: !!submittedItems &&
                        submittedItems.every((item) => item.handoffChecklistValid)
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Pass the error up
        if (err) {
            throw err;
        }
        if (!submittedItems ||
            !onSubmissionDone ||
            !refreshOut ||
            !refreshLog ||
            !installLogFiles ||
            !email ||
            !log) {
            throw new Error(`PreAddPackage - a return value did not get set correctly`);
        }
        return {
            submittedItems,
            onSubmissionDone,
            refreshOut,
            refreshLog,
            installLogFiles,
            email,
            log
        };
    }
    async addPackage(params) {
        const { submittedItems, onSubmissionDone, refreshOut, refreshLog, installLogFiles, submissionId, email, log } = params;
        let err = null;
        let outerEntries = null;
        let processingCompletedWithoutFatalError = false;
        let stageDone = false;
        let refreshSuccess = false;
        try {
            // Stage the submission
            log.debugLogger.info(`AddPackage - Staging submission = ${submissionId}`);
            const { stagedItems, error } = await this.stagePackages({
                submittedItems,
                log,
                submissionId
            });
            outerEntries = stagedItems;
            if (error) {
                throw error;
            }
            else if (!stagedItems) {
                throw new Error('No staged items');
            }
            stageDone = true;
            // Process the packages
            log.debugLogger.info(`AddPackage - refreshing ${JSON.stringify(stagedItems)}`);
            let errInner = null;
            ({ err: errInner, processingCompletedWithoutFatalError } = await this.refreshPackages({
                stagedItems,
                log,
                refreshLog
            }));
            err = util.getCombinedError(err, errInner);
            refreshSuccess = !err;
            if (!err) {
                // Save the submission
                log.debugLogger.info(`AddPackage - saving items for submission ${submissionId}`);
                outerEntries = await this.savePackages({ stagedItems, log });
            }
            else {
                throw err;
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        try {
            if (outerEntries && params.serverHost) {
                await this.notifySubmissionCompletedForAdditonalTesting(params.serverHost, outerEntries, log);
            }
            else {
                log.debugLogger.info('handoff server hostname unresolved, skipping notifying to ' +
                    'Testing agents for additional testing');
            }
        }
        catch (error) {
            // the error is being ignored here for now,
            // and the handoff process is proceeding to the next step
            log.debugLogger.info(error);
        }
        // Cleanup
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
            if (outerEntries && (!stageDone || (err && err instanceof errors_1.GracefulError))) {
                (log || this.defaultLog).debugLogger.info(`Rolling back ${JSON.stringify(outerEntries)}`);
                await this._rollbackPackages({
                    entries: outerEntries,
                    processingCompletedWithoutFatalError,
                    log: log || this.defaultLog
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        try {
            await this._postProcessingPlaceholderForTesting();
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Call onSubmissionDone (sends email)
        try {
            if (onSubmissionDone) {
                (log || this.defaultLog).debugLogger.info(`AddPackage - Calling onSubmissionDone for submission ${submissionId}`);
                const emailTag = outerEntries
                    ? outerEntries.map((item) => `${item.id}__${item.version}`).join(', ')
                    : submissionId;
                await onSubmissionDone({
                    err,
                    refreshSuccess,
                    stageDone,
                    emailTag,
                    additonalAttachments: installLogFiles,
                    handoffChecklistValid: submittedItems.every((item) => item.handoffChecklistValid)
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // DB publishing (sends email when finished)
        try {
            if (outerEntries && log && !err) {
                log.debugLogger.info(`AddPackage - doing dbImportAndPublish for submission ${submissionId}`);
                const emailTag = outerEntries
                    .map((item) => `${item.id}__${item.version}`)
                    .join(', ');
                await (0, db_release_and_import_1.dbImportAndPublish)(email, 'add', this.vars.dbBasePath, log, emailTag);
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        // Close the logger
        if (log) {
            log.closeLoggers();
        }
        // Pass the error up
        if (err) {
            throw err;
        }
    }
    // Exported for tests only
    async _rollbackPackages(params) {
        const { entries, log, processingCompletedWithoutFatalError } = params;
        let err = null;
        try {
            // Stage
            const stagedItems = await (0, promise_utils_1.mapSerially)(entries, async (entry) => {
                const { request, stagedEntry } = await this.packageManagerAdapter.stageRollbackPackage({
                    entry,
                    log: log || this.defaultLog
                });
                return { request, entry, stagedEntry };
            });
            // Process
            let processingSuccess = false;
            if (processingCompletedWithoutFatalError) {
                // We processed the packages
                let rollbackProcessingGracefullyFailed = false;
                const refreshParams = await util.getRefreshParams(stagedItems.map((item) => ({
                    ...item,
                    // - Set showEntry = true so everything is processed
                    // - We set request to add / remove based on the showEntry value
                    // - If there's no stagedEntry then we are deleting, so using the old entry is fine
                    entry: item.stagedEntry
                        ? { ...item.stagedEntry, showEntry: true }
                        : { ...item.entry, showEntry: true }
                })), await this.packageManagerAdapter.getAllEntries(log), this.vars.contentBasePath, this.vars.zipsFolder);
                const passed = await this.refreshFn(refreshParams, this.defaultLog);
                if (!passed) {
                    err = util.getCombinedError(err, new Error('Packages failed to process during rollback'));
                    rollbackProcessingGracefullyFailed = true;
                }
                processingSuccess = !rollbackProcessingGracefullyFailed;
            }
            // Rollback
            await (0, promise_utils_1.mapSerially)(stagedItems, async ({ entry, stagedEntry }) => {
                await this.packageManagerAdapter.rollbackPackage({
                    entry,
                    stagedEntry,
                    log: log || this.defaultLog,
                    processingSuccess
                });
            });
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        if (err) {
            throw err;
        }
    }
    // For test purposes only
    async _postProcessingPlaceholderForTesting() { }
    // Private
    // calling Jenkins Server for metadata sanity test
    async notifySubmissionCompletedForAdditonalTesting(serverHost, entries, log) {
        const serverURLPrefixforZips = vars_1.Vars.REMOTE_BUNDLE_ZIPS
            ? vars_1.Vars.REMOTE_BUNDLE_ZIPS
            : vars_1.Vars.LOCAL_BUNDLE_ZIPS
                ? `http://${serverHost}/${vars_1.Vars.ROLE ? vars_1.Vars.ROLE + '/' : ''}zips/`
                : '';
        const url = vars_1.Vars.SYSCONFIG_TEST_SERVER_URL;
        for (const entry of entries) {
            const sendInfo = {
                email: entry.email,
                packagePaths: entry.zips.map((zip) => serverURLPrefixforZips + zip)
            };
            log.debugLogger.info(`Testing submission for Sysconfig metadata = ${entry.submissionId}`);
            const { data, statusCode } = await (0, request_helpers_1.doFormDataPostRequest)(url, sendInfo);
            log.debugLogger.info(`status code: ${statusCode}, data: ${data}`);
        }
    }
    async stagePackages({ submittedItems, log, submissionId }) {
        const stagedItems = [];
        let err = null;
        try {
            // Handle modules
            let processedSubmittedItems = null;
            try {
                processedSubmittedItems = await (0, process_modules_1.processModules)(submittedItems, this.packageManagerAdapter, this.vars.contentBasePath, this.vars.zipsFolder, log);
            }
            catch (e) {
                // Cleanup submissions
                const toRemove = _.flatten(submittedItems.map((item) => [item.downloadFolder, item.extractFolder]));
                await Promise.all(toRemove.map((item) => fs.remove(item)));
                throw e;
            }
            // Stage
            await (0, promise_utils_1.mapSerially)(processedSubmittedItems, async (item) => {
                const stagedEntries = await this.stagePackageInner(submissionId, item.uploadedEntry, {
                    downloadFolder: item.downloadFolder,
                    extractFolder: item.extractFolder,
                    packageFolders: item.packageFolders,
                    nonPackageFolders: item.nonPackageFolders,
                    zips: item.zips
                }, log);
                if (!stagedEntries) {
                    throw new Error('No staged entry');
                }
                stagedItems.push(stagedEntries);
                await (0, handoff_checklist_helpers_1.saveHandoffChecklists)({
                    entry: item.uploadedEntry,
                    stagedEntries,
                    submissionId,
                    log
                });
            });
        }
        catch (e) {
            err = e;
        }
        return { stagedItems: _.flatten(stagedItems), error: err };
    }
    async refreshPackages({ refreshLog, stagedItems, log }) {
        let processingCompletedWithoutFatalError = false;
        let processingGracefullyFailed = false;
        let err = null;
        try {
            // Refresh the package
            const refreshParams = await util.getRefreshParams(stagedItems.map((item) => ({ entry: item, request: 'add' })), await this.packageManagerAdapter.getAllEntries(log), this.vars.contentBasePath, this.vars.zipsFolder);
            const passed = await this.refreshFn(refreshParams, refreshLog);
            processingCompletedWithoutFatalError = true;
            if (!passed) {
                processingGracefullyFailed = true;
                throw new errors_1.GracefulError('Packages failed to process');
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        return { err, processingCompletedWithoutFatalError, processingGracefullyFailed };
    }
    async savePackages({ stagedItems, log }) {
        return (0, promise_utils_1.mapSerially)(stagedItems, (entry) => {
            return this.packageManagerAdapter.addPackage({
                entry,
                log
            });
        });
    }
    async getSubmission(assetUploads, uploadedEntry, installLogFiles, log) {
        let err = null;
        let installOut = null;
        // Setup a log file for the installer, and save the value.
        // This way if we fail along the way, we can send the log.
        if (uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */ &&
            uploadedEntry.installCommand[response_data_1.Platform.LINUX]) {
            const command = uploadedEntry.installCommand[response_data_1.Platform.LINUX];
            const { logOut: installOutInner, logFile: installLogFile } = await util.prepareLogFile(this.vars.contentBasePath, `${command}.log`);
            installLogFiles.push(installLogFile);
            installOut = installOutInner;
        }
        // Get the submission
        const { downloadFolder, extractFolder, packageFolders, nonPackageFolders, zips, handoffChecklistValid } = uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */
            ? await (0, prepare_handoff_1.prepareHandoff)({
                uploadedEntry,
                contentFolder: this.vars.contentBasePath,
                assetUploads,
                log,
                submissionType: uploadedEntry.submissionType,
                installOut,
                packageManagerAdapter: this.packageManagerAdapter
            })
            : await (0, prepare_handoff_1.prepareHandoff)({
                uploadedEntry,
                contentFolder: this.vars.contentBasePath,
                assetUploads,
                log,
                submissionType: uploadedEntry.submissionType
            });
        try {
            if (installOut) {
                // We were able to install, don't include the log
                const logFile = installLogFiles.pop();
                if (logFile) {
                    await fs.remove(path.dirname(logFile));
                }
                // Cleanup the stream
                await new Promise((resolve) => {
                    if (installOut && installOut.writable) {
                        installOut.end(resolve);
                    }
                    else {
                        resolve();
                    }
                });
            }
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        return {
            downloadFolder,
            extractFolder,
            packageFolders,
            nonPackageFolders,
            zips,
            uploadedEntry,
            handoffChecklistValid
        };
    }
    async stagePackageInner(submissionId, uploadedEntry, submission, log) {
        let stagedEntries = null;
        let err = null;
        try {
            // Stage the submission
            if (uploadedEntry.submissionType === "installer" /* util.SubmissionType.INSTALLER */) {
                const info = await Promise.all(submission.packageFolders.map(async (folder) => {
                    const info = await (0, package_helpers_1.getPackageInfo)(folder);
                    if (!info) {
                        throw new Error(`No info for folder ${folder}`);
                    }
                    let zipsInner = [];
                    const pkg = uploadedEntry.submittedPackage;
                    if (pkg.id === info.id && pkg.version === info.version) {
                        zipsInner = submission.zips;
                    }
                    return { folder, info, zips: zipsInner };
                }));
                const groupedPackageFolders = _.chain(info)
                    .groupBy((item) => `${item.info.id}__${item.info.version}`)
                    .map((item) => item.reduce((accum, item) => {
                    return {
                        packageFolders: [...accum.packageFolders, item.folder],
                        zips: item.zips,
                        isNonTirexPackage: false,
                        showEntry: uploadedEntry.submittedPackage.id === item.info.id &&
                            uploadedEntry.submittedPackage.version === item.info.version
                    };
                }, {
                    packageFolders: [],
                    zips: [],
                    isNonTirexPackage: false,
                    showEntry: false
                }))
                    .value();
                stagedEntries = await (0, promise_utils_1.mapSerially)([
                    ...groupedPackageFolders,
                    ...submission.nonPackageFolders.map((item) => ({
                        packageFolders: [item],
                        zips: [],
                        isNonTirexPackage: true,
                        showEntry: false
                    }))
                ], async ({ packageFolders, zips, isNonTirexPackage, showEntry }) => {
                    return this.packageManagerAdapter.stageAddPackage({
                        packageFolders,
                        zips,
                        submissionId,
                        email: uploadedEntry.email,
                        downloadFolder: submission.downloadFolder,
                        extractFolder: submission.extractFolder,
                        showEntry,
                        log,
                        isNonTirexPackage
                    });
                });
            }
            else {
                stagedEntries = [
                    await this.packageManagerAdapter.stageAddPackage({
                        packageFolders: submission.packageFolders,
                        zips: submission.zips,
                        submissionId,
                        email: uploadedEntry.email,
                        downloadFolder: submission.downloadFolder,
                        extractFolder: submission.extractFolder,
                        showEntry: true,
                        log
                    })
                ];
            }
            const msg = `Packages were discovered in the following folders: ${submission.packageFolders.map((pkg) => path_helpers_1.PathHelpers.getRelativePath(pkg, this.vars.contentBasePath))}`;
            util.logMessage(log.userLogger.info, msg);
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        try {
            await this.packageManagerAdapter.cleanupPackageSubmission({
                downloadFolder: submission.downloadFolder,
                extractFolder: submission.extractFolder
            });
        }
        catch (e) {
            err = util.getCombinedError(err, e);
        }
        if (err) {
            throw err;
        }
        return stagedEntries;
    }
    async sendProcessingStartedEmail(submittedItems, email, submissionId, handoffQueued, log) {
        const packageFolders = submittedItems.map((item) => item.packageFolders.map((pkgFolder) => path.basename(pkgFolder)));
        const packagesMessage = _.uniq(_.flatten(packageFolders)).join(', ');
        const pkgMessage = `The package(s) were successfully received, submission id ${submissionId}. ` +
            `Package(s) were detected in the following folders: ${packagesMessage}<br><br>`;
        const queuedMessage = `TIREX has queued this package for processing. ` +
            `Once the previous submission is completed, you will receive 2 additional emails: When the package(s) are processed, and when the handoff is complete.`;
        const processingMessage = `TIREX is now processing the metadata and will send 2 additional emails: When the package(s) are processed, and when the handoff is complete.`;
        await util.sendEmail(email, `- Received, ${handoffQueued ? 'queued for' : 'started'} processing`, `${pkgMessage}\n${handoffQueued ? queuedMessage : processingMessage}`, log, 'add');
    }
}
exports.AddPackage = AddPackage;
