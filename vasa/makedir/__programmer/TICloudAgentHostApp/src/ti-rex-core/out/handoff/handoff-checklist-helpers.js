"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHandoffChecklist = exports.saveHandoffChecklists = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
// our modules
const vars_1 = require("../lib/vars");
const util = require("./util");
const promise_utils_1 = require("../utils/promise-utils");
// save the handoffChecklist for staged items
async function saveHandoffChecklists({ entry, stagedEntries, submissionId, log }) {
    const handoffChecklistsFolder = vars_1.Vars.HANDOFF_CHECKLISTS_FOLDER;
    await (0, promise_utils_1.mapSerially)(stagedEntries, async (item) => {
        const newHandoffChecklistFileName = `${item.id}__${item.version}.json`;
        const handoffChecklistFilePath = path.join(handoffChecklistsFolder, newHandoffChecklistFileName);
        try {
            if (entry.handoffChecklist) {
                await fs.outputJSON(handoffChecklistFilePath, getHandoffChecklistFileData(submissionId, entry.handoffChecklist));
                const msg = `handoffChecklist for package ${newHandoffChecklistFileName} saved`;
                util.logMessage(log.userLogger.info, msg);
            }
        }
        catch (err) {
            const msg = `error while saving handoffChecklist for package ` +
                `${newHandoffChecklistFileName}: ${err}`;
            util.logMessage(log.debugLogger.error, msg);
            throw err;
        }
    });
}
exports.saveHandoffChecklists = saveHandoffChecklists;
function getHandoffChecklistFileData(submissionId, checklistData) {
    const data = {
        submissionId,
        checklist: checklistData
    };
    return data;
}
function validateHandoffChecklist(handoffChecklist, log) {
    if (!handoffChecklist) {
        const msg = `No Handoff Checklist in submission. ` +
            `Please check submission metadata. ` +
            `See here for info on the checklist: ` +
            `https://confluence.itg.ti.com/pages/viewpage.action?pageId=557573124`;
        util.logMessage(log.userLogger.warning, msg);
        // TODO: change the warning above to error and throw new GracefulError('Invalid submission')
        return true;
    }
    else {
        return false;
    }
}
exports.validateHandoffChecklist = validateHandoffChecklist;
