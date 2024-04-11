"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const ajax_harness_1 = require("../../test/ajax-harness/ajax-harness");
const apis_1 = require("../apis/apis");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const get_package_groups_from_browser_url_query_1 = require("./get-package-groups-from-browser-url-query");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const Data = require("../../test/server-harness/server-harness-data");
const util_1 = require("./util");
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
packageNode2, packageNode3, packageNode4, packageNode5, 
// PackageGroups
packageGroup2, packageGroup3, packageGroup4, packageGroup5, 
// Packages
package2, package3, package4, package5 } = Data;
// ServerDataInput
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
const data2 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package4],
        packageGroups: [packageGroup2, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode4].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode4.nodeDbId]: packageNode4
    }
};
const data3 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3, package4],
        packageGroups: [packageGroup2, packageGroup3, packageGroup4]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode3, packageNode4].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode3.nodeDbId]: packageNode3,
        [packageNode4.nodeDbId]: packageNode4
    }
};
const data4 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package3, package4, package5],
        packageGroups: [packageGroup2, packageGroup3, packageGroup4, packageGroup5]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode3, packageNode4, packageNode5].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode3.nodeDbId]: packageNode3,
        [packageNode4.nodeDbId]: packageNode4,
        [packageNode5.nodeDbId]: packageNode5
    }
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] getPackageGroupsFromBrowserUrlQuery', function () {
    let ajaxHarness;
    let apis;
    before(() => (0, browser_emulator_1.browserEmulator)());
    beforeEach(function () {
        ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        apis = new apis_1.APIs();
    });
    afterEach(function () {
        ajaxHarness.cleanup();
    });
    it('Should handle the default selection (latest + offline)', async function () {
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({ addedPackages: [], removedPackages: [] });
        validateResult([packageGroup2], args);
    });
    it('Should handle an added package (not latest)', async function () {
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            addedPackages: [
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
            ],
            removedPackages: []
        });
        validateResult([packageGroup2, packageGroup3], args);
    });
    it('Should handle an added package with the latest label', async function () {
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            addedPackages: [`${packageGroup4.packageGroupPublicId}__${util_1.LATEST}`],
            removedPackages: []
        });
        validateResult([packageGroup2, packageGroup4], args);
    });
    it('Should handle a removed package (not latest)', async function () {
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            addedPackages: [],
            removedPackages: [
                `${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`
            ]
        });
        validateResult([packageGroup2], args);
    });
    it('Should handle a removed package with the latest label', async function () {
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            addedPackages: [],
            removedPackages: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        });
        validateResult([packageGroup4], args);
    });
    it('Should handle an added and removed package', async function () {
        await ajaxHarness.setupTestFakeServer(data3);
        const args = await callMethod({
            addedPackages: [
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
            ],
            removedPackages: [
                `${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`
            ]
        });
        validateResult([packageGroup2, packageGroup3], args);
    });
    it('Should handle multiple added / removed packages', async function () {
        await ajaxHarness.setupTestFakeServer(data4);
        const args = await callMethod({
            addedPackages: [
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`,
                `${packageGroup5.packageGroupPublicId}__${packageGroup5.packageGroupVersion}`
            ],
            removedPackages: [
                `${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`,
                `${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`
            ]
        });
        validateResult([packageGroup3, packageGroup5], args);
    });
    it('Should handle a package both added and removed (not latest) - remove takes precedence', async function () {
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            addedPackages: [
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`,
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
            ],
            removedPackages: [
                `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
            ]
        });
        validateResult([packageGroup2], args);
    });
    it('Should handle a package both added and removed (latest) - (remove takes precedence)', async function () {
        await ajaxHarness.setupTestFakeServer(data3);
        const args = await callMethod({
            addedPackages: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`],
            removedPackages: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        });
        validateResult([packageGroup4], args);
    });
    it('Should handle an invalid added package (garbage key)', async function () {
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({ addedPackages: ['foo'], removedPackages: [] });
        validateResult([packageGroup2], args);
    });
    it('Should handle an invalid removed package (garbage key)', async function () {
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({ addedPackages: [], removedPackages: ['foo'] });
        validateResult([packageGroup2, packageGroup4], args);
    });
    async function callMethod({ addedPackages, removedPackages }) {
        const allGroups = await apis.getPackageGroups();
        const filterOptions = await apis.getFilterOptions();
        return (0, get_package_groups_from_browser_url_query_1.getPackagesGroupsFromBrowserUrlQuery)(addedPackages, removedPackages, allGroups, filterOptions);
    }
});
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function validateResult(inputGroups, outputGroups) {
    (0, expect_1.expect)(outputGroups).to.exist;
    (0, expect_1.expect)(outputGroups.length).to.equal(inputGroups.length);
    outputGroups.map((outputGroup, idx) => {
        (0, expect_1.expect)(outputGroup).to.deep.equal(inputGroups[idx]);
    });
}
