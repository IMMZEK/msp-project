"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const chai_1 = require("chai");
const path = require("path");
const childProcess = require("child_process");
const rex_1 = require("../rex");
const fsutils_1 = require("../../utils/fsutils");
const refresh_1 = require("./refresh");
const { loggerManager } = (0, rex_1._getRex)();
/**
 * Note: Requires file path to ti-rex-testData repo in testingGlobals.testdataPath. Pass in the path
 * using --testData option. To see refresh log on the console set --consoleLog=true.
 */
// This test is emitting large amounts of console output - it should not console.log anything.
// Use our internal logging solution instead.
describe.skip('refresh', async function () {
    this.timeout(1000 * 60 * 10);
    it('should successfully do a refresh', async () => {
        // refresh input
        const refreshGoldenLogFolder = path.join(scriptsUtil.dataFolder, 'refreshGoldenLog');
        const defaultJson = path.join(refreshGoldenLogFolder, 'config', 'default.json');
        const contentBasePath = path.join(test_helpers_1.testingGlobals.testdataPath, 'refreshGoldenLogPackages');
        const validationType = 'schema';
        // refresh output
        const dbBasePath = path.join(scriptsUtil.generatedDataFolder, 'refreshGoldenLog', 'db');
        // do the refresh
        const refreshManager = new refresh_1.RefreshManager(dbBasePath, loggerManager.createLogger('refresh'));
        await refreshManager.refreshUsingConfigFile(defaultJson, contentBasePath, validationType);
        // check that the refresh generated the files we expect
        const goldenLogDbFolder = path.join(refreshGoldenLogFolder, 'db-staged');
        const goldenFiles = (0, fsutils_1.readDirRecursive)(goldenLogDbFolder);
        const refreshFiles = (0, fsutils_1.readDirRecursive)(dbBasePath);
        (0, chai_1.expect)(refreshFiles).to.deep.equal(goldenFiles);
        // now do a diff of each db file
        const cmd = `diff -r --suppress-common-lines ${goldenLogDbFolder} ${dbBasePath}`;
        const stdout = await new Promise(resolve => {
            childProcess.exec(cmd, (error, stdout, _stderr) => {
                if (error) {
                    console.log(stdout);
                }
                resolve(stdout);
            });
        });
        // tslint:disable-next-line:no-unused-expression
        (0, chai_1.expect)(stdout).to.be.empty;
    });
});
