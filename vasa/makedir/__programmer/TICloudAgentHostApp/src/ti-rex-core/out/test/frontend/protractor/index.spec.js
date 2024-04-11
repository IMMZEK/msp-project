'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const protractor_1 = require("protractor");
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const expect_1 = require("../../expect");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const util_2 = require("../../../frontend/component-helpers/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Package Nodes
packageNode2, packageNode3, 
// PackageGroups
packageGroup2, packageGroup3, 
// Packages
package2, package3 } = Data;
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] Index', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    before(() => {
        (0, browser_emulator_1.browserEmulator)();
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
        await (0, util_1.cleanupProtractorTest)();
    });
    const data1 = {
        inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
        filterData: {
            ...emptyFilterData,
            packages: [package2, package3],
            packageGroups: [packageGroup2, packageGroup3]
        },
        rootNode,
        hierarchy: {
            [rootNode]: [packageNode2, packageNode3].map(item => item.nodeDbId)
        },
        nodeData: {
            [packageNode2.nodeDbId]: packageNode2,
            [packageNode3.nodeDbId]: packageNode3
        }
    };
    const apis = new apis_1.APIs();
    it('Should be possible to go home by clicking on the nav title - REX-2712#1', async function () {
        await (0, util_1.setupProtractorTest)({ data: data1, apis });
        await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.navbarTitle)).click();
        const indicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
        await (0, browser_scripts_1.waitForPromisesToResolve)(indicies);
        const url = await protractor_1.browser.getCurrentUrl();
        (0, expect_1.expect)(url).to.deep.include(test_helpers_1.testingGlobals.remoteserverUrl);
    });
});
