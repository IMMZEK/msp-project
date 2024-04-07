'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
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
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../frontend/component-helpers/util");
const browser_scripts_1 = require("../browser-scripts");
const filter_1 = require("../page-objects/filter");
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
// Devices
device1, 
// Package Nodes
packageNode2: _packageNode2, packageNode3: _packageNode3, 
// PackageGroups
packageGroup2, packageGroup3, 
// Packages
package2, package3, 
// FilterData
resource1, kernel1, compiler1 } = Data;
const packageNode2 = {
    ..._packageNode2,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [device1.publicId],
        filterResourceClass: [resource1.publicId],
        filterKernel: [kernel1.publicId],
        filterCompiler: [compiler1.publicId]
    }
};
const packageNode3 = {
    ..._packageNode3,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [device1.publicId],
        filterResourceClass: [resource1.publicId],
        filterKernel: [kernel1.publicId],
        filterCompiler: [compiler1.publicId]
    }
};
const radioButtonTestData = [
    {
        queryString: 'resourceClasses',
        publicId: resource1.publicId,
        initialItem: { queryString: 'kernels', publicId: kernel1.publicId }
    },
    {
        queryString: 'kernels',
        publicId: kernel1.publicId,
        initialItem: { queryString: 'compilers', publicId: compiler1.publicId }
    },
    {
        queryString: 'compilers',
        publicId: compiler1.publicId,
        initialItem: { queryString: 'kernels', publicId: kernel1.publicId }
    }
];
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        devices: [device1],
        packages: [package2, package3],
        packageGroups: [packageGroup2, packageGroup3],
        resourceClasses: [resource1],
        kernels: [kernel1],
        compilers: [compiler1]
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
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
// TODO some of these tests can be removed once we convert filter.tsx to hooks and leverage use-apis.ts
describe('[frontend] Filter - REX-1063#1, REX-2749#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
    });
    const apis = new apis_1.APIs();
    // Rendering
    it('Should display device when device suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        await filter_1.BoardDeviceInput.click();
        await filter_1.BoardDeviceInput.clickSuggestion(`Device-${device1.publicId}`);
        const selected = await filter_1.BoardDeviceInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    it('Should display keyword when keyword suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        await filter_1.KeywordInput.enterText(device1.name);
        await filter_1.KeywordInput.clickSuggestion(device1.name);
        const selected = await filter_1.KeywordInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    radioButtonTestData.forEach(radioButtonTest => {
        it(`Should display correct ${radioButtonTest.queryString.toLowerCase()} radio buttons`, async function () {
            await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
            await filter_1.Filter.verifyRadioButtonPresence(radioButtonTest.queryString, radioButtonTest.publicId);
        });
    });
    // Inputs should update URL (Filter -> URL)
    it('Should update URL when device suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        await filter_1.BoardDeviceInput.click();
        await filter_1.BoardDeviceInput.clickSuggestion(`Device-${device1.publicId}`);
        await (0, util_2.verifyUrl)({ apis, urlQuery: { devices: [device1.publicId] } });
    });
    it('Should update URL when keyword suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
        await filter_1.KeywordInput.enterText(device1.name);
        await filter_1.KeywordInput.clickSuggestion(device1.name);
        await (0, util_2.verifyUrl)({ apis, urlQuery: { search: device1.name } });
    });
    radioButtonTestData.forEach(radioButtonTest => {
        it(`Should update URL when ${radioButtonTest.queryString.toLowerCase()} radio button is clicked`, async function () {
            await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: {} });
            await (0, util_2.waitForPromisesAfterActionToResolve)(() => (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_3.TEST_ID.filterRadioButton(radioButtonTest.queryString, radioButtonTest.publicId)))));
            await (0, util_2.verifyUrl)({
                apis,
                urlQuery: { [radioButtonTest.queryString]: radioButtonTest.publicId }
            });
        });
    });
    // Filter should derive state from URL (URL -> Filter)
    it('Should display device from URL', async function () {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { devices: [device1.publicId] }
        });
        await filter_1.Filter.openAllFiltersPopup();
        const selected = await filter_1.BoardDeviceInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    it('Should display keyword query from URL', async function () {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { search: device1.name }
        });
        await filter_1.Filter.openAllFiltersPopup();
        const selected = await filter_1.KeywordInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    radioButtonTestData.forEach(radioButtonTest => {
        it(`Should display ${radioButtonTest.queryString.toLowerCase()} from URL`, async function () {
            await (0, util_1.lightSetupProtractorTest)({
                apis,
                node: packageNode2,
                urlQuery: { [radioButtonTest.queryString]: [radioButtonTest.publicId] }
            });
            await filter_1.Filter.openAllFiltersPopup();
            await filter_1.Filter.verifyRadioButtonValue(radioButtonTest.queryString, radioButtonTest.publicId, true);
        });
    });
    // Filter should be able to update a non-default URL (URL -> Filter -> URL)
    it('Should update non-default URL when device suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        await filter_1.Filter.openAllFiltersPopup();
        await filter_1.BoardDeviceInput.click();
        await filter_1.BoardDeviceInput.clickSuggestion(`Device-${device1.publicId}`);
        await (0, util_2.verifyUrl)({
            apis,
            urlQuery: { devices: [device1.publicId], kernels: [kernel1.publicId] }
        });
    });
    it('Should update non-default URL when keyword suggestion is clicked', async function () {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        await filter_1.Filter.openAllFiltersPopup();
        await filter_1.KeywordInput.enterText(device1.name);
        await filter_1.KeywordInput.clickSuggestion(device1.name);
        console.log('verifying url');
        await (0, util_2.verifyUrl)({ apis, urlQuery: { kernels: [kernel1.publicId], search: device1.name } });
    });
    radioButtonTestData.forEach(radioButtonTest => {
        it(`Should update non-default URL when ${radioButtonTest.queryString.toLowerCase()} radio button is clicked`, async function () {
            await (0, util_1.lightSetupProtractorTest)({
                apis,
                node: packageNode2,
                urlQuery: {
                    [radioButtonTest.initialItem.queryString]: [
                        radioButtonTest.initialItem.publicId
                    ]
                }
            });
            await filter_1.Filter.openAllFiltersPopup();
            const prevIndcies = await (0, browser_scripts_1.getActivePromiseIndicies)();
            await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_3.TEST_ID.filterRadioButton(radioButtonTest.queryString, radioButtonTest.publicId))));
            const indcies = await (0, browser_scripts_1.getActivePromiseIndicies)();
            await (0, browser_scripts_1.waitForPromisesToResolve)(_.difference(indcies, prevIndcies));
            await (0, util_2.verifyUrl)({
                apis,
                urlQuery: {
                    [radioButtonTest.initialItem.queryString]: radioButtonTest.initialItem.publicId,
                    [radioButtonTest.queryString]: radioButtonTest.publicId
                }
            });
        });
    });
    // Updates to URL should be reflected in filter (URL -> URL -> Filter)
    it('Should display device from URL after non-default URL updates', async function () {
        // Initial url
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        // Update url
        await (0, util_2.updateBrowserUrl)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId], devices: [device1.publicId] }
        });
        await filter_1.Filter.openAllFiltersPopup();
        const selected = await filter_1.BoardDeviceInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    it('Should display keyword query from URL after non-default URL updates', async function () {
        // Initial url
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId] }
        });
        // Update url
        await (0, util_2.updateBrowserUrl)({
            apis,
            node: packageNode2,
            urlQuery: { kernels: [kernel1.publicId], search: device1.name }
        });
        await filter_1.Filter.openAllFiltersPopup();
        const selected = await filter_1.KeywordInput.getValue();
        (0, expect_1.expect)(selected).to.equal(device1.name);
    });
    radioButtonTestData.forEach(radioButtonTest => {
        it(`Should display ${radioButtonTest.queryString.toLowerCase()} from URL after non-default URL updates`, async function () {
            // Initial url
            await (0, util_1.lightSetupProtractorTest)({
                apis,
                node: packageNode2,
                urlQuery: {
                    [radioButtonTest.initialItem.queryString]: [
                        radioButtonTest.initialItem.publicId
                    ]
                }
            });
            // Update url
            await (0, util_2.updateBrowserUrl)({
                apis,
                node: packageNode2,
                urlQuery: {
                    [radioButtonTest.initialItem.queryString]: [
                        radioButtonTest.initialItem.publicId
                    ],
                    [radioButtonTest.queryString]: [radioButtonTest.publicId]
                }
            });
            await filter_1.Filter.openAllFiltersPopup();
            await filter_1.Filter.verifyRadioButtonValue(radioButtonTest.queryString, radioButtonTest.publicId, true);
        });
    });
});
