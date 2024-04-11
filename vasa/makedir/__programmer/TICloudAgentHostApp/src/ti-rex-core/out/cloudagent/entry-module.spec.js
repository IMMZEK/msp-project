"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[cloudagent] EntryModule', function () {
    describe('eventBroker', function () {
        it.skip('Should not make calls to event broker in cloud', async function () { });
        // ccs_port
        it.skip('Should handle port being passed in via event broker', async function () { });
        it.skip('Should handle port being passed in via config file', async function () { });
        it.skip('Should handle port not being set in event broker or config', async function () { });
        // proxy values
        it.skip('Should handle proxy being set in event broker', async function () { });
        it.skip('Should handle proxy being set via process.env', async function () { });
        it.skip('Should handle proxy not being set in event broker', async function () { });
    });
    it.skip('Should not make ccsAdapter in cloud', async function () { });
    describe('vars', function () {
        it.skip('Should get the version from the config file', async function () { });
        it.skip('Should get the agent mode from the config file', async function () { });
        it.skip('Should read the correct config file on windows / non-windows', async function () { });
    });
    describe('startup', function () {
        it.skip('Should detect any packages on the fs, not in the db, then add them', async function () { });
        it.skip('Should detect any packages in the db, not on the fs, then remove them', async function () { });
    });
    describe('desktopQueue', function () {
        it.skip('Should queue installPackage (critical section)', async function () {
            // Should not make calls to OfflineMetadataManager or move into the content folder until its turn
            // Could block the queue with a task that never finishes then use sinon to verify the above
        });
        it.skip('Should queue uninstallPackage (critical section)', async function () {
            // Should not make calls to OfflineMetadataManager or move into the content folder until its turn
            // Could block the queue with a task that never finishes then use sinon to verify the above
        });
        it.skip('Should queue sync calls, startup', async function () {
            // Should not make calls to OfflineMetadataManager or move into the content folder until its turn
            // Could block the queue with a task that never finishes then use sinon to verify the above
        });
        it.skip('Should queue sync calls, on productsChanged', async function () {
            // Should not make calls to OfflineMetadataManager or move into the content folder until its turn
            // Could block the queue with a task that never finishes then use sinon to verify the above
        });
        it.skip('Should handle previous items in the queue affecting the next item', async function () {
            // Multiple tests, for each combo should test them
            // - coming back to back
            // - one comes, wait until it hits the critical section, then start the next one, then let the first one go
            // All tests involve the same package in some combo
            // 1) Add & remove
            // Add, Add
            // Remove, remove
            // Add, remove
            // remove, add
            // 2) sync(add) & sync(remove)
            // sync (add), sync (add)
            // ....
            // 3) sync(add) & Add
            // ...
            // 4) ...
        });
    });
});
