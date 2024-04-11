"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageLogsDeletion = exports.manageLogsSubmission = void 0;
// 3rd party
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const util_1 = require("util");
// our modules
const vars_1 = require("../lib/vars");
const logging_1 = require("../utils/logging");
const path_helpers_1 = require("../shared/path-helpers");
const util = require("./util");
const helpers_node_1 = require("../shared/helpers-node");
const errors_1 = require("../shared/errors");
// Promisefied methods
const getUniqueFolderPath = (0, util_1.promisify)(path_helpers_1.PathHelpers.getUniqueFolderPath);
const sendEmail = (0, util_1.promisify)(helpers_node_1.sendEmail);
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Manage the logs for the submission.
 *  Create the submission logs.
 *  Email the logs when submission is done.
 *  Close the loggers once we are complete.
 *
 */
async function manageLogsSubmission(args) {
    const { email } = args;
    const { log, refreshLog, refreshLogfile, refreshOut, getMessageBody } = await manageLogs(args);
    // Handle post submission
    const onSubmissionDone = async ({ err, refreshSuccess, stageDone, emailTag, additonalAttachments, handoffChecklistValid }) => {
        if (!err) {
            logMessage(log.userLogger.info, 'Submission successful');
        }
        else if (!refreshSuccess && stageDone) {
            const file = path.basename(refreshLogfile);
            logMessage(log.userLogger.error, `Packages did not pass refresh, see the attached ${file} for more info`);
        }
        else {
            logMessage(log.userLogger.error, typeof err === 'string' ? err : err.message);
            if (typeof err !== 'string' && err.stack) {
                logMessage(log.userLogger.error, err.stack);
            }
        }
        if (err instanceof errors_1.GracefulError) {
            logMessage(log.userLogger.info, 'Note if this was a replace the packages were reverted to the previous revision. ' +
                'If this was not a replace then the packages were removed');
        }
        const attachments = [
            ...(!refreshSuccess && stageDone
                ? [
                    {
                        path: refreshLogfile,
                        filename: path.basename(refreshLogfile)
                    }
                ]
                : []),
            ...(additonalAttachments
                ? additonalAttachments.map((item) => ({
                    path: item,
                    filename: path.basename(item)
                }))
                : [])
        ];
        if (email || vars_1.Vars.MAILING_LIST) {
            const emailSubjectPrefix = `Handoff to ${os.hostname()}`;
            const receiver = `${email},${vars_1.Vars.MAILING_LIST}`;
            try {
                if (!err) {
                    const subjectLine = !handoffChecklistValid && !vars_1.Vars.BU_HANDOFF_TESTING_SERVER
                        ? `${emailSubjectPrefix} - Warning: Handoff Checklist is missing. ` +
                            `Processing completed [${emailTag}]`
                        : `${emailSubjectPrefix} - Processing completed [${emailTag}]`;
                    await sendEmail({
                        receiver,
                        subject: subjectLine,
                        payload: 'Processing of the package(s) was successfully completed. ' +
                            'You will receive another email after the package is added to ' +
                            'the database and is visible in Resource Explorer.<br><br>' +
                            getMessageBody(),
                        attachments
                    });
                }
                else {
                    await sendEmail({
                        receiver,
                        subject: `${emailSubjectPrefix} - FAILED to process [${emailTag}]`,
                        payload: getMessageBody(),
                        attachments
                    });
                }
            }
            catch (e) {
                // Allow email to fail (i.e bad recipient)
                logMessage(log.debugLogger.warning, `Unable to send email to ${receiver} due to below error`);
                logMessage(log.debugLogger.error, e);
            }
        }
        try {
            // Assume all attachments were in a unique subfolder
            await Promise.all([...(additonalAttachments || []), refreshLogfile].map((item) => fs.remove(path.dirname(item))));
        }
        catch (e) {
            logMessage(log.debugLogger.warning, 'Unable to delete tmp folder');
            logMessage(log.debugLogger.error, e);
        }
    };
    return { onSubmissionDone, log, refreshLog, refreshOut };
}
exports.manageLogsSubmission = manageLogsSubmission;
/**
 * Manage the logs for the deletion.
 *  Create the submission logs.
 *  Email the logs when submission is done.
 *  Close the loggers once we are complete.
 *
 */
async function manageLogsDeletion(args) {
    const { email } = args;
    const { log, refreshLog, refreshPath, refreshLogfile, refreshOut, getMessageBody } = await manageLogs(args);
    // Handle post submission
    const onSubmissionDone = async ({ err, stageDone, refreshSuccess, emailTag, additonalAttachments }) => {
        if (!err) {
            logMessage(log.userLogger.info, 'Deletion successful');
        }
        else if (!refreshSuccess && stageDone) {
            logMessage(log.userLogger.error, `Package did not pass refresh, see the attached ${refreshLogfile} for more info`);
        }
        else {
            logMessage(log.userLogger.error, typeof err === 'string' ? err : err.stack || '');
        }
        if (err instanceof errors_1.GracefulError) {
            logMessage(log.userLogger.info, 'No changes made to the server');
        }
        const attachments = [
            ...(!refreshSuccess && stageDone
                ? [
                    {
                        path: refreshLogfile,
                        filename: path.basename(refreshLogfile)
                    }
                ]
                : []),
            ...(additonalAttachments
                ? [
                    additonalAttachments.map((item) => ({
                        path: item,
                        filename: path.basename(item)
                    }))
                ]
                : [])
        ];
        if (email || vars_1.Vars.MAILING_LIST) {
            const receiver = `${email},${vars_1.Vars.MAILING_LIST}`;
            try {
                await sendEmail({
                    receiver,
                    subject: `Deletion to ${os.hostname()} - ${!err ? 'Processing Completed' : 'FAILED to process'} [${emailTag}]`,
                    payload: 'Deletion of the package(s) was successfully completed. ' +
                        'You will receive an additional email once all other handoff steps are complete. <br><br>' +
                        getMessageBody(),
                    attachments: !err ? [] : attachments
                });
            }
            catch (e) {
                // Allow email to fail (i.e bad recipient)
                logMessage(log.debugLogger.warning, `Unable to send email to ${receiver} due to bellow error`);
                logMessage(log.debugLogger.error, e);
            }
        }
        try {
            // remove tmp folder and all its contents
            await fs.remove(refreshPath);
        }
        catch (e) {
            logMessage(log.debugLogger.warning, 'Unable to delete tmp folder');
            logMessage(log.debugLogger.error, e);
        }
    };
    return { onSubmissionDone, log, refreshLog, refreshOut };
}
exports.manageLogsDeletion = manageLogsDeletion;
async function manageLogs(args) {
    const { submissionId, loggerManager } = args;
    const { refreshLogfile, refreshOut, refreshPath } = await prepareRefreshLogfile();
    // Manage the logs
    let messageBody = '';
    const getMessageBody = () => messageBody;
    const onRefreshMessage = (message) => {
        refreshOut.write(message);
    };
    const onLogMessage = (message) => {
        messageBody += message;
    };
    const { refreshLog, log } = await streamLogs({
        submissionId,
        onLogMessage,
        onRefreshMessage,
        loggerManager
    });
    logMessage(log.userLogger.info, `Submission id: ${submissionId}`);
    return { log, refreshLog, refreshLogfile, refreshPath, refreshOut, getMessageBody };
}
async function streamLogs({ submissionId, onRefreshMessage, onLogMessage, loggerManager }) {
    // Create the logs
    const log = new logging_1.Log({
        userLogger: loggerManager.createLogger(`upload-${submissionId}-user`),
        debugLogger: loggerManager.createLogger(`upload-${submissionId}-debug`)
    });
    const refreshLog = new logging_1.Log({
        userLogger: loggerManager.createLogger(`upload-${submissionId}-user-refresh`),
        debugLogger: loggerManager.createLogger(`upload-${submissionId}-debug-refresh`)
    });
    // Stream the logs
    refreshLog.userLogger.on('data', (message) => {
        message = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
        onRefreshMessage(util.transformLogMessage(message));
    });
    log.userLogger.on('data', (message) => {
        message = typeof message === 'string' ? Buffer.from(message, 'utf8') : message;
        onLogMessage(util.transformLogMessage(message));
    });
    return { log, refreshLog };
}
async function prepareRefreshLogfile() {
    const refreshPath = await getUniqueFolderPath(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'tmp'));
    const refreshLogfile = path.join(refreshPath, 'refresh.html');
    await fs.ensureFile(refreshLogfile);
    const refreshOut = fs.createWriteStream(refreshLogfile);
    return new Promise((resolve, reject) => {
        let done = false;
        refreshOut.once('open', () => {
            if (!done) {
                resolve({ refreshLogfile, refreshOut, refreshPath });
            }
            done = true;
        });
        refreshOut.once('error', (err) => {
            if (!done) {
                reject(err);
            }
            done = true;
        });
    });
}
function logMessage(logMethod, message) {
    logMethod(message, ['handoff']);
}
