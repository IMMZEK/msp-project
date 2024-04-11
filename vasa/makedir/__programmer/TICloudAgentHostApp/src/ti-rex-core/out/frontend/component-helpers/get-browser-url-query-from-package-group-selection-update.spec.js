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
const get_browser_url_query_from_package_group_selection_update_1 = require("./get-browser-url-query-from-package-group-selection-update");
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
packageNode2, packageNode3, packageNode4, 
// PackageGroups
packageGroup2, packageGroup3, packageGroup4, 
// Packages
package2, package3, package4 } = Data;
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
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] getBrowserUrlQueryFromPackageGroupSelectionUpdate', function () {
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
    it('Should handle an added package (not latest)', async function () {
        const params = {
            a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            query: {},
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle a removed package (not latest)', async function () {
        const params = {
            r: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            query: {},
            group: packageGroup3,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle an added package, latest but useLatest = false', async function () {
        // query should have specific version (not latest)
        const params = {
            a: [`${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup4,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle a removed package, latest but useLatest = false', async function () {
        // query should have specific version (not latest)
        const params = {
            r: [`${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup4,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle an added package, latest and useLatest = true', async function () {
        // latest packages don't get added
        const params = {};
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup4,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: true
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle a removed package, latest and useLatest = true', async function () {
        // query should have latest, not specific version
        const params = {
            r: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: true
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
    });
    it('Should handle a request to add something which is already added', async function () {
        // query should not have 2 duplicates
        const params = {
            a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            query: {},
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
        const args2 = await callMethod({
            query: args,
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(params);
    });
    it('Should handle a request to remove something which is already removed', async function () {
        // query should not have 2 duplicates
        const params = {
            r: [`${packageGroup4.packageGroupPublicId}__${packageGroup4.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup4,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(params);
        const args2 = await callMethod({
            query: args,
            group: packageGroup4,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(params);
    });
    it('Should handle a request to add something which is currently removed', async function () {
        // Should no longer be in the removed list but appear in the added list
        const param1 = {
            r: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        const param2 = {
            a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            query: {},
            group: packageGroup3,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to remove something which is currently added', async function () {
        // Should no longer be in the added list but appear in the remove list
        const param1 = {
            a: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        const param2 = {
            r: [`${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data1);
        const args = await callMethod({
            query: {},
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup3,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to add something (use latest = true) which is already added (use latest = false)', async function () {
        // Should have nothing in the urlQuery (switches to 'latest')
        const param1 = {
            a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        const param2 = {};
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: true
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to remove something (use latest = true) which is already removed (use latest = false)', async function () {
        // Should have both specific version and 'latest' in the query
        const param1 = {
            r: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        const param2 = {
            r: [
                `${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`,
                `${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`
            ]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: true
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to remove something (use latest = false) which is already removed (use latest = true)', async function () {
        // Should have both specific version and 'latest' in the query
        const param1 = {
            r: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        };
        const param2 = {
            r: [
                `${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`,
                `${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`
            ]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: true
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to add something (use latest = true), which is currently removed (use latest = false)', async function () {
        const param1 = {
            r: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        const param2 = {};
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: true
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to add something (use latest = false), which is currently removed (use latest = true)', async function () {
        // Should have specific in added and latest in removed
        const param1 = {
            r: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        };
        const param2 = {
            a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: true
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to remove something (use latest = true), which is currently added (use latest = false)', async function () {
        const param1 = {
            a: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        const param2 = {
            r: [`${packageGroup2.packageGroupPublicId}__${util_1.LATEST}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: false
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: true
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should handle a request to remove something (use latest = false), which is currently added (use latest = true)', async function () {
        const param1 = {};
        const param2 = {
            r: [`${packageGroup2.packageGroupPublicId}__${packageGroup2.packageGroupVersion}`]
        };
        await ajaxHarness.setupTestFakeServer(data2);
        const args = await callMethod({
            query: {},
            group: packageGroup2,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: true
        });
        (0, expect_1.expect)(args).to.deep.equal(param1);
        const args2 = await callMethod({
            query: args,
            group: packageGroup2,
            update: "Removed" /* PackageGroupSelectionUpdate.Removed */,
            useLatest: false
        });
        (0, expect_1.expect)(args2).to.deep.equal(param2);
    });
    it('Should reject a request to add something with useLatest = true which is not the latest', async function () {
        await ajaxHarness.setupTestFakeServer(data1);
        await (0, expect_1.expect)(callMethod({
            query: {},
            group: packageGroup3,
            update: "Added" /* PackageGroupSelectionUpdate.Added */,
            useLatest: true
        })).to.be.eventually.rejected;
    });
    async function callMethod({ query, group, update, useLatest }) {
        const allGroups = await apis.getPackageGroups();
        const filterOptions = await apis.getFilterOptions();
        return (0, get_browser_url_query_from_package_group_selection_update_1.getBrowserUrlQueryFromPackageGroupSelectionUpdate)(query, group, update, useLatest, allGroups, filterOptions);
    }
});
