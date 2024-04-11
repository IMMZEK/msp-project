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
const breadcumb_1 = require("../page-objects/breadcumb");
const browser_emulator_1 = require("../browser-emulator");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../shared/util");
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
packageNode2, packageNode3, packageNode4, 
// PackageGroups
packageGroup2, packageGroup3, packageGroup4, 
// Packages
package2, package3, package4, 
// Folder Nodes
folderNode2, folderNode3, folderNode4, folderNode5 } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3, package4],
        packageGroups: [packageGroup2, packageGroup3, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId, packageNode4.nodeDbId],
        [packageNode2.nodeDbId]: [folderNode2.nodeDbId, folderNode3.nodeDbId],
        [folderNode2.nodeDbId]: [folderNode4.nodeDbId],
        [folderNode4.nodeDbId]: [folderNode5.nodeDbId]
    },
    nodeData: (0, util_3.objectFromKeyValuePairs)([
        packageNode2,
        packageNode3,
        packageNode4,
        folderNode2,
        folderNode3,
        folderNode4,
        folderNode5
    ].map(node => ({ key: node.nodeDbId, value: node })))
};
const initalItem = folderNode5;
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] Breadcrumb', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    beforeEach(async function () {
        await (0, util_1.lightSetupProtractorTest)({ apis, node: initalItem, urlQuery: {} });
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
    });
    const apis = new apis_1.APIs();
    it('Should display the path of the currently selected item', async function () {
        await breadcumb_1.Breadcrumb.verifyBreadcrumb([packageNode2, folderNode2, folderNode4, folderNode5], initalItem);
    });
    it('Should handle selecting an ancestor node (should maintain full path)', async function () {
        const ancestorItem = packageNode2;
        await breadcumb_1.Breadcrumb.clickBreadcrumbItem(ancestorItem);
        await breadcumb_1.Breadcrumb.verifyBreadcrumb([packageNode2, folderNode2, folderNode4, folderNode5], ancestorItem);
    });
    it('Should handle selecting a node which is not an ancestor', async function () {
        const nonAncestorItem = packageNode4;
        await (0, util_2.updateBrowserUrl)({ apis, node: nonAncestorItem, urlQuery: {} });
        await breadcumb_1.Breadcrumb.verifyBreadcrumb([packageNode4], nonAncestorItem);
    });
});
