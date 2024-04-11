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
const Data = require("../data");
const expect_1 = require("../../expect");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const navbar_1 = require("../page-objects/navbar");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../shared/util");
const util_4 = require("../../../frontend/component-helpers/util");
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Kernels
kernel1, kernel2, 
// Package Nodes
packageNode2, packageNode3, 
// PackageGroups
packageGroup2, packageGroup3, 
// Packages
package2, package3 } = Data;
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] RestoreLastSession', function () {
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
            packageGroups: [packageGroup2, packageGroup3],
            kernels: [kernel1, kernel2]
        },
        rootNode,
        hierarchy: {
            [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId]
        },
        nodeData: (0, util_3.objectFromKeyValuePairs)([packageNode2, packageNode3].map(node => ({ key: node.nodeDbId, value: node })))
    };
    const apis = new apis_1.APIs();
    // Showing / hiding load last session option
    it("Should not show load last session if we are set to automatically load last session & we don't have a url query", async function () {
        await createLastSession({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis, clearLocalStorage: false });
        await verifyLoadLastSession(false);
    });
    it("Should show load last session if we are not set to automatically load last session & we don't have a url query", async function () {
        await createLastSession({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel1.publicId] },
            duringSession: () => toggleAutoLoadLastSession()
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis, clearLocalStorage: false });
        await verifyLoadLastSession(true);
    });
    it('Should not show load last session if we are set to not automatically load last session & we have a url query', async function () {
        await createLastSession({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel1.publicId] },
            duringSession: () => toggleAutoLoadLastSession()
        });
        await (0, util_1.setupProtractorTest)({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel2.publicId] },
            clearLocalStorage: false
        });
        await verifyLoadLastSession(false);
    });
    it("Should not show load last session if we didn't have a url query in the last session", async function () {
        await createLastSession({
            data: data1,
            apis,
            duringSession: () => toggleAutoLoadLastSession()
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis });
        await verifyLoadLastSession(false);
    });
    it('Should not show load last session once we add a url query (we start without one)', async function () {
        await createLastSession({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel1.publicId] },
            duringSession: () => toggleAutoLoadLastSession()
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis, clearLocalStorage: false });
        await verifyLoadLastSession(true);
        // Update url and verify again
        await (0, util_2.updateBrowserUrl)({ apis, urlQuery: { kernels: [kernel2.publicId] } });
        await verifyLoadLastSession(false);
    });
    // Loading last session
    it('Should be able to load last session', async function () {
        const lastSessionUrlQuery = { kernels: [kernel1.publicId] };
        await createLastSession({
            data: data1,
            apis,
            urlQuery: lastSessionUrlQuery,
            duringSession: () => toggleAutoLoadLastSession()
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis, clearLocalStorage: false });
        await verifyLoadLastSession(true);
        // Load last session and verify url
        await loadLastSession();
        await (0, util_2.verifyUrl)({ apis, urlQuery: lastSessionUrlQuery });
    });
    // Automatically loading last session
    it('Should automatically load the last session', async function () {
        const lastSessionUrlQuery = { kernels: [kernel1.publicId] };
        await createLastSession({
            data: data1,
            apis,
            urlQuery: lastSessionUrlQuery
        });
        await (0, util_1.setupProtractorTest)({ data: data1, apis, clearLocalStorage: false });
        await verifyLoadLastSession(false);
        // Verify session auto loaded
        await (0, util_2.verifyUrl)({ apis, urlQuery: lastSessionUrlQuery });
    });
    it('Should not load the last session if we open with an initial url query', async function () {
        const currentSessionUrlQuery = { kernels: [kernel2.publicId] };
        await createLastSession({
            data: data1,
            apis,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        await (0, util_1.setupProtractorTest)({
            data: data1,
            apis,
            urlQuery: currentSessionUrlQuery,
            clearLocalStorage: false
        });
        await verifyLoadLastSession(false);
        // Verify session not auto loaded
        await (0, util_2.verifyUrl)({ apis, urlQuery: currentSessionUrlQuery });
    });
});
async function createLastSession({ data, apis, urlQuery, duringSession }) {
    await (0, util_1.setupProtractorTest)({ data, apis, urlQuery });
    if (duringSession) {
        await duringSession();
    }
    await (0, util_1.cleanupProtractorTest)();
}
// Actions
async function loadLastSession() {
    await navbar_1.Navbar.openMenu();
    await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.navbarMenuLoadLastSession)));
    await protractor_1.browser.wait(protractor_1.ExpectedConditions.not(protractor_1.ExpectedConditions.visibilityOf((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.navbarMenu)))), 500, 'Menu did not close');
}
async function toggleAutoLoadLastSession() {
    await navbar_1.Navbar.openMenu();
    await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.navbarMenuAutoLoadLastSession)));
    await navbar_1.Navbar.closeMenu();
}
// Verify
async function verifyLoadLastSession(expectedIsPresent) {
    await navbar_1.Navbar.openMenu();
    await (0, expect_1.expect)((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.navbarMenuLoadLastSession)).isPresent()).to.eventually.equal(expectedIsPresent);
    await navbar_1.Navbar.closeMenu();
}
