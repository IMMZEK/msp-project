"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTestingGlobals = exports.testingGlobals = exports.getUniqueFolderName = exports.getUniqueFileName = void 0;
const path = require("path");
const scriptsUtil = require("../../scripts-lib/util");
/**
 * Get a unique file name (at least for the current execution)
 *
 * @returns file
 */
let counter = 0;
function getUniqueFileName() {
    return (counter++).toString();
}
exports.getUniqueFileName = getUniqueFileName;
/**
 * Get a unique folder name (at least for the current execution)
 *
 * @returns folder - an absolute path
 */
function getUniqueFolderName(prefix = 'folder') {
    return path.join(scriptsUtil.generatedDataFolder, prefix + getUniqueFileName()) + path.sep;
}
exports.getUniqueFolderName = getUniqueFolderName;
function setTestingGlobals(args) {
    const { dinfra: dinfraPath = '', remoteserverUrl, configuration, reqLimit, testMode, customTest, testData } = args;
    const globals = {
        dinfraPath,
        remoteserverUrl,
        testConfig: configuration,
        reqLimit: reqLimit || 1,
        testMode,
        customTest,
        testdataPath: testData
    };
    exports.testingGlobals = globals;
}
exports.setTestingGlobals = setTestingGlobals;
