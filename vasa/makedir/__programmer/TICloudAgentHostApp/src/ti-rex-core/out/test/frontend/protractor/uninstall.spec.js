'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
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
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const node_context_menu_1 = require("../page-objects/node-context-menu");
const expect_1 = require("../../expect");
const uninstall_1 = require("../page-objects/uninstall");
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
packageNode2, packageNode51, 
// PackageGroups
packageGroup2, packageGroup51, 
// Packages
package2, package51 } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package51],
        packageGroups: [packageGroup2, packageGroup51]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode51].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode51.nodeDbId]: packageNode51
    }
};
const displayTestOptions = {
    installInfo: ['/home/auser'],
    localPackages: [{ pkg: package2, path: '/home/auser/foo' }].map(({ pkg, path }) => Data.createInstalledPackageData(pkg, path))
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] Uninstall - REX-2605#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    beforeEach(async function () {
        await setup(displayTestOptions);
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
        await (0, browser_scripts_1.uninstallCloudAgent)();
    });
    it('Should request to uninstall a package', async function () {
        await node_context_menu_1.NodeContextMenu.openUninstall(packageNode2, apis);
        await uninstall_1.Uninstall.yes();
        await verifyCall([packageNode2.packagePublicUid]);
    });
    it('Should not request to uninstall if we decline in the confirmation dialog', async function () {
        await node_context_menu_1.NodeContextMenu.openUninstall(packageNode2, apis);
        await uninstall_1.Uninstall.no();
        await verifyNotCalled(packageNode2.packagePublicUid);
    });
    async function verifyCall(expectedPackagePublicUids) {
        const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
        const args = spies.uninstallPackage.args;
        (0, expect_1.expect)(args.length).to.equal(expectedPackagePublicUids.length);
        const packagePublicUids = args.map(item => {
            (0, expect_1.expect)(item.length).to.equal(1);
            return item[0].packagePublicUid;
        });
        (0, expect_1.expect)(packagePublicUids.sort()).to.deep.equal(expectedPackagePublicUids.sort());
    }
    async function verifyNotCalled(packagePublicUid) {
        const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
        const args = spies.uninstallPackage.args;
        const uninstallCall = !!args.find(item => {
            (0, expect_1.expect)(item.length).to.equal(1);
            return item[0].packagePublicUid === packagePublicUid;
        });
        (0, expect_1.expect)(uninstallCall).to.be.false;
    }
    async function setup(options) {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            additionalSetup: () => (0, browser_scripts_1.installCloudAgent)(options)
        });
    }
});
